import JoinModel from '../index';
import sqlParser from 'sql-parser';
import sqlOpToFunction from '../../../lib/sqlOpToFunction';
// let sideConnectionWorker = require('worker-loader!./sideConnectionWorker.js');

// TODO: remove these two debugging lines
window.sqlOpToFunction = sqlOpToFunction;
window.sqlParser = sqlParser;

class ThetaJoin extends JoinModel {
  constructor () {
    super(...arguments);

    this.setExpression(null);
  }
  countAllPresetConnections (indices, items, lookup, modelName, oppositeModel) {
    // Attribute-based presets require a full table scan
    return oppositeModel.fullScan(chunk => {
      // TODO: do this behind the scenes in a web worker so it doesn't lock up the UI
      chunk.data.forEach((oppItem, localOppIndex) => {
        let globalOppIndex = localOppIndex + chunk.globalStartIndex;
        indices.forEach((globalIndex, localIndex) => {
          let itemsToCompare = {};
          itemsToCompare[modelName] = {
            index: globalIndex,
            item: items[localIndex]
          };
          itemsToCompare[oppositeModel.name] = {
            index: globalOppIndex,
            item: oppItem
          };
          let details = lookup[globalIndex];
          if (!this.indexInRanges(globalOppIndex, details.scannedRanges) &&
              this.joinExpressionFunc(itemsToCompare)) {
            details.totalConnections += 1;
            if (details.navigationOffsets.length < JoinModel.MAX_NAVIGATION_OFFSETS) {
              details.navigationOffsets.push(globalOppIndex);
            }
          }
        });
      });
      // Incrementally update the interface after each chunk has been processed
      this.trigger('update');
    });
  }
  computeVisibleConnections () {
    return new Promise((resolve, reject) => {
      this.leftIndices.forEach((globalLeftIndex, localLeftIndex) => {
        this.rightIndices.forEach((globalRightIndex, localRightIndex) => {
          let itemsToCompare = {};
          itemsToCompare[this.leftModel.name] = {
            index: globalLeftIndex,
            item: this.leftItems[localLeftIndex]
          };
          itemsToCompare[this.rightModel.name] = {
            index: globalRightIndex,
            item: this.rightItems[localRightIndex]
          };
          let connectionKey = globalLeftIndex + '_' + globalRightIndex;
          // Create connections if the user has explicitly created it, or
          // the theta expression evaluates to true (except, of course, if the
          // user has explicitly removed this connection)
          if (this.customConnections[connectionKey] ||
             (this.joinExpressionFunc(itemsToCompare) && !this.customRemovals[connectionKey])) {
            this.createVisibleConnection(globalLeftIndex, globalRightIndex);
          }
        });
      });
      resolve();
    });
  }
  setExpression (joinExpression) {
    this.expressionError = ThetaJoin.EXPRESSION_ERRORS.NONE;
    if (!joinExpression) {
      this.expressionError = ThetaJoin.EXPRESSION_ERRORS.EMPTY;
    } else if (!this.leftModel || !this.rightModel) {
      this.expressionError = ThetaJoin.EXPRESSION_ERRORS.MISSING_MODEL;
    } else {
      this.expressionError = ThetaJoin.EXPRESSION_ERRORS.EVALUATING;
      this.constructSqlExpression(joinExpression);
    }
    // We don't actually have a theta expression yet...
    // so even though theta join is selected, default to concatenation behavior
    this.joinExpression = null;
    this.joinExpressionFunc = (itemsToCompare) => false;
  }

  stripName (name) {
    // sql-parser only supports table and attribute names;
    // this function strips out characters that cause problems
    return name.replace(/[^a-zA-Z0-9$_]/g, '');
  }
  autoInferThetaExpression (callback) {
    if (!this.leftModel || !this.rightModel) {
      return;
    }
    Promise.all([
      this.leftModel.allProperties(),
      this.rightModel.allProperties()
    ]).then(([leftProps, rightProps]) => {
      leftProps.some(p => {
        if (rightProps.indexOf(p) !== -1) {
          // Quote table and property names where necessary
          let leftName = this.leftModel.name;
          if (this.stripName(leftName) !== leftName) {
            leftName = '"' + leftName + '"';
          }
          let rightName = this.rightModel.name;
          if (this.stripName(rightName) !== rightName) {
            rightName = '"' + rightName + '"';
          }
          let commonProp = p;
          if (this.stripName(commonProp) !== commonProp) {
            commonProp = "'" + commonProp + "'";
          }
          let expression = leftName + '.' + commonProp + ' = ' + rightName + '.' + commonProp;
          // Only bother issuing a callback and changing the function if we found a match
          callback(expression);
          return true;
        }
      });
    });
  }
  constructSqlExpression (joinExpression) {
    let self = this;
    Promise.all([this.leftModel.allProperties(), this.rightModel.allProperties()])
      .then(([leftProps, rightProps]) => {
        // Start off with a full SQL expression (TODO: when we get to set operations
        // or attribute extraction, this will probably get more complicated...)
        let fullSqlExpression = 'SELECT * FROM ' + this.leftModel.name + ' JOIN ' +
          this.rightModel.name + ' ON ' + joinExpression;

        // Replace any quoted table names with an escaped version
        // (sql-parser can't handle quoted table or attribute names)
        let originalTableNames = {};
        [this.leftModel.name, this.rightModel.name].forEach(tableName => {
          // Strip the table name down to something sql-parser can handle
          // (we don't have to worry about duplicates; JoinInterfaceView
          // enforces that each JoinableModel has a unique name with a number,
          // and sql-parser can handle numbers in table names)
          let strippedName = this.stripName(tableName);
          if (strippedName !== tableName) {
            originalTableNames[strippedName] = tableName;

            // We're going to make a regex out of tableName; first let's escape
            // any special regex characters
            tableName = tableName.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            // Table names (that we need to replace) will be wrapped in quotes
            tableName = '"' + tableName + '"';
            // Replace all occurrences of the quoted table name
            fullSqlExpression = fullSqlExpression.replace(new RegExp(tableName, 'g'), strippedName);
          }
        });

        // Replace quoted attribute names
        let originalProperties = {};
        function replaceQuotedProperties (props) {
          props.forEach(prop => {
            // Strip the name down to something sql-parser can handle
            let strippedName = self.stripName(prop);

            // Make strippedName unique, and add it to a lookup
            let uniqueStrippedName = strippedName;
            let i = 2;
            while (originalProperties.hasOwnProperty(uniqueStrippedName)) {
              uniqueStrippedName = strippedName + i;
              i += 1;
            }
            originalProperties[uniqueStrippedName] = prop;

            if (uniqueStrippedName !== prop) {
              // We're going to make a regex out of prop; first escape any special
              // regex characters
              prop = prop.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
              // Property names (that we need to replace) will be wrapped in
              // single quotes
              prop = "'" + prop + "'";
              // Replace all occurrences of the quoted property name
              fullSqlExpression = fullSqlExpression.replace(new RegExp(prop, 'g'), uniqueStrippedName);
            }
          });
        }
        replaceQuotedProperties(leftProps);
        replaceQuotedProperties(rightProps);

        function restoreOriginalNames (obj) {
          if (obj.left) {
            obj.left = restoreOriginalNames(obj.left);
          }
          if (obj.right) {
            obj.right = restoreOriginalNames(obj.right);
          }
          if (obj.value) {
            let valueType = typeof obj.value;
            if (valueType === 'string' && originalTableNames[obj.value]) {
              obj.value = originalTableNames[obj.value];
              obj.values[0] = originalTableNames[obj.value];
            } else if (valueType === 'object') {
              obj.value = restoreOriginalNames(obj.value);
            }
          }
          if (obj.value2) {
            let valueType = typeof obj.value2;
            if (valueType === 'string' && originalProperties[obj.value2]) {
              obj.value2 = originalProperties[obj.value2];
              obj.values[1] = originalProperties[obj.value2];
            } else if (valueType === 'object') {
              obj.value2 = restoreOriginalNames(obj.value2);
            }
          }
          return obj;
        }

        try {
          // Parse the SQL query
          let conditionTokens = sqlParser.lexer.tokenize(fullSqlExpression);
          let parsedQuery = sqlParser.parser.parse(conditionTokens);
          // TODO: for now, we're only interested in the ON expression
          let opObj = parsedQuery.joins[0].conditions;
          // Replace any stripped names with their originals
          opObj = restoreOriginalNames(opObj);
          this.joinExpressionFunc = sqlOpToFunction(opObj);
          this.joinExpression = joinExpression;
        } catch (e) {
          console.warn(e);
          this.expressionError = ThetaJoin.EXPRESSION_ERRORS.SYNTAX;
        }

        // Now that that's finally sorted, restart the connection computation process
        // (TODO: it will have already been started by changePreset() ... should clean
        // this up next refactor)
        this.startComputingConnections(this.leftIndices, this.rightIndices, this.leftItems, this.rightItems);
      });
  }
}

ThetaJoin.EXPRESSION_ERRORS = {
  NONE: 'NONE',
  EVALUATING: 'EVALUATING',
  EMPTY: 'EMPTY',
  MISSING_MODEL: 'MISSING_MODEL',
  SYNTAX: 'SYNTAX'
};

export default ThetaJoin;
