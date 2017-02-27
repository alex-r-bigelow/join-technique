import Model from '../../lib/Model';
import sqlParser from 'sql-parser';
import sqlOpToFunction from '../../lib/sqlOpToFunction';
// let sideConnectionWorker = require('worker-loader!./sideConnectionWorker.js');

// TODO: remove these two debugging lines
window.sqlOpToFunction = sqlOpToFunction;
window.sqlParser = sqlParser;

let NUM_NAVIGATION_OFFSETS = 5;

class JoinModel extends Model {
  constructor (leftModel, rightModel) {
    super();
    this.leftModel = leftModel;
    this.rightModel = rightModel;

    this.currentPreset = JoinModel.PRESETS.CONCATENATION;
    this.expressionError = JoinModel.EXPRESSION_ERRORS.NONE;
    this.joinExpression = null;
    this.joinExpressionFunc = (itemsToCompare) => false;

    // each of these is keyed by "globalLeftIndex_globalRightIndex"
    this.customConnections = {};
    this.customRemovals = {};

    this.startComputingConnections([], [], [], []);
  }
  startComputingConnections (leftIndices, rightIndices, leftItems, rightItems) {
    return this.pauseWebWorkers().then(() => {
      this.leftIndices = leftIndices;
      this.rightIndices = rightIndices;
      this.leftItems = leftItems;
      this.rightItems = rightItems;
      this.visiblePresetConnections = {};
      this.visibleConnectionStatus = JoinModel.STATUS.COMPUTING;
      this.leftConnectionStatus = JoinModel.STATUS.COMPUTING;
      this.rightConnectionStatus = JoinModel.STATUS.COMPUTING;

      function initLookup (olddetails, indices) {
        // TODO: keep information from paused counting passes
        // olddetails = olddetails || {};
        let details = {};
        indices.forEach((globalIndex, localIndex) => {
          details[globalIndex] = {
            visiblePresetConnectionKeys: [],
            totalConnections: 0,
            stillCounting: true,
            navigationOffsets: [],
            scannedRanges: [],
            localIndex
          };
        });
        return details;
      }
      this.leftLookup = initLookup(this.leftLookup, this.leftIndices);
      this.rightLookup = initLookup(this.rightLookup, this.rightIndices);

      this.computeVisibleConnections().then(() => {
        this.visibleConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(JoinModel.SIDE.LEFT).then(() => {
        this.leftConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(JoinModel.SIDE.RIGHT).then(() => {
        this.rightConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
    });
  }
  changeFocusItems (leftIndices, rightIndices) {
    let leftItems = this.leftModel ? this.leftModel.getItems(leftIndices) : Promise.resolve([]);
    let rightItems = this.rightModel ? this.rightModel.getItems(rightIndices) : Promise.resolve([]);
    Promise.all([leftItems, rightItems])
      .then(([leftItems, rightItems]) => {
        this.startComputingConnections(leftIndices, rightIndices, leftItems, rightItems);
      });
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
          this.expressionError = JoinModel.EXPRESSION_ERRORS.SYNTAX;
        }

        // Now that that's finally sorted, restart the connection computation process
        // (TODO: it will have already been started by changePreset() ... should clean
        // this up next refactor)
        this.startComputingConnections(this.leftIndices, this.rightIndices, this.leftItems, this.rightItems);
      });
  }
  changePreset (preset, joinExpression) {
    if (this.currentPreset === preset && this.joinExpression === joinExpression) {
      // Nothing is actually changing... so we can leave things as they were
      return;
    }
    this.currentPreset = preset;
    // Changing the preset invalidates the customizations; clear them:
    this.customRemovals = {};
    this.customConnections = {};
    switch (preset) {
      case JoinModel.PRESETS.EQUIJOIN:
      case JoinModel.PRESETS.THETA_JOIN:
        this.expressionError = JoinModel.EXPRESSION_ERRORS.NONE;
        if (!joinExpression) {
          this.expressionError = JoinModel.EXPRESSION_ERRORS.EMPTY;
        } else if (!this.leftModel || !this.rightModel) {
          this.expressionError = JoinModel.EXPRESSION_ERRORS.MISSING_MODEL;
        } else {
          this.expressionError = JoinModel.EXPRESSION_ERRORS.EVALUATING;
          this.constructSqlExpression(joinExpression);
        }
        // We don't actually have a theta expression yet...
        // so even though theta join is selected, default to concatenation behavior
        this.joinExpression = null;
        this.joinExpressionFunc = (itemsToCompare) => false;
        break;
      case JoinModel.PRESETS.CROSS_PRODUCT:
        this.joinExpression = null;
        this.joinExpressionFunc = (itemsToCompare) => true;
        break;
      case JoinModel.PRESETS.ORDERED_JOIN:
        this.joinExpression = null;
        this.joinExpressionFunc = (itemsToCompare) => {
          let keys = Object.keys(itemsToCompare);
          return itemsToCompare[keys[0]].index === itemsToCompare[keys[1]].index;
        };
        break;
      case JoinModel.PRESETS.CONCATENATION:
        this.joinExpression = null;
        this.joinExpressionFunc = (itemsToCompare) => false;
        break;
      default:
        throw new Error('Unknown preset: ' + this.currentPreset);
    }
    this.startComputingConnections(this.leftIndices, this.rightIndices, this.leftItems, this.rightItems);
  }
  pauseWebWorkers () {
    // TODO
    return Promise.resolve();
  }
  indexInRanges (index, ranges) {
    let inrange = false;
    ranges.some(range => {
      inrange = index >= range.low && index < range.high;
      return inrange;
    });
    return inrange;
  }
  addIndexToRange (index, ranges) {
    let added = false;
    ranges.some(range => {
      if (index === range.low - 1) {
        range.low -= 1;
        added = true;
      } else if (index === range.high) {
        range.high += 1;
        added = true;
      } else if (index >= range.low && index < range.high) {
        added = true;
      }
      return added;
    });
    if (!added) {
      ranges.push({
        low: index,
        high: index + 1
      });
    }
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
          if (this.customConnections[connectionKey] ||
                (!this.customRemovals[connectionKey] && this.joinExpressionFunc(itemsToCompare))) {
            let leftItemDetails = this.leftLookup[globalLeftIndex];
            leftItemDetails.visiblePresetConnectionKeys.push(connectionKey);
            let rightItemDetails = this.rightLookup[globalRightIndex];
            rightItemDetails.visiblePresetConnectionKeys.push(connectionKey);
            this.visiblePresetConnections[connectionKey] = true;
          }
        });
      });
      resolve();
    });
  }
  countAllConnections (side) {
    let indices, items, lookup, modelName, oppositeModel, extractIndices;
    if (side === JoinModel.SIDE.LEFT) {
      if (this.leftModel === null) {
        return Promise.resolve(); // no model yet; nothing to count
      }
      indices = this.leftIndices;
      items = this.leftItems;
      lookup = this.leftLookup;
      modelName = this.leftModel.name;
      oppositeModel = this.rightModel;
      extractIndices = k => {
        let [left, right] = k.split('_');
        return {
          globalIndex: left,
          globalOppIndex: right
        };
      };
    } else {
      if (this.rightModel === null) {
        return Promise.resolve(); // no model yet; nothing to count
      }
      indices = this.rightIndices;
      items = this.rightItems;
      lookup = this.rightLookup;
      modelName = this.rightModel.name;
      oppositeModel = this.rightModel;
      extractIndices = k => {
        let [left, right] = k.split('_');
        return {
          globalOppIndex: left,
          globalIndex: right
        };
      };
    }
    let resultPromise;
    if (oppositeModel === null) {
      // okay, there are no connections to count, but one side at least should
      // be marked as finished
      resultPromise = Promise.resolve();
    } else {
      switch (this.currentPreset) {
        case JoinModel.PRESETS.EQUIJOIN:
        case JoinModel.PRESETS.THETA_JOIN:
          // Attribute-based presets require a full table scan
          resultPromise = oppositeModel.fullScan(chunk => {
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
                  if (details.navigationOffsets.length < NUM_NAVIGATION_OFFSETS) {
                    details.navigationOffsets.push(globalOppIndex);
                  }
                }
              });
            });
            // Incrementally update the interface after each chunk has been processed
            this.trigger('update');
          });
          break;
        case JoinModel.PRESETS.CROSS_PRODUCT:
          // We already know the total count (the size of all items in the opposite set)
          resultPromise = oppositeModel.numTotalItems().then(count => {
            indices.forEach((globalIndex, localIndex) => {
              let details = lookup[globalIndex];
              details.totalConnections = count;
              details.navigationOffsets = []; // including offsets is kind of pointless, so don't bother
            });
          });
          break;
        case JoinModel.PRESETS.ORDERED_JOIN:
          // We already know the total count (1), and which connection to jump to just
          // by the global index number
          resultPromise = new Promise((resolve, reject) => {
            indices.forEach((globalIndex, localIndex) => {
              let details = lookup[globalIndex];
              details.totalConnections = 1;
              details.navigationOffsets = [globalIndex];
            });
            resolve();
          });
          break;
        case JoinModel.PRESETS.CONCATENATION:
          // There are no connections; numPresetConnections and navigationOffsets are already
          // correct (0 and empty)
          resultPromise = Promise.resolve();
          break;
        default:
          throw new Error('Unknown preset: ' + this.currentPreset);
      }
      resultPromise = resultPromise.then(() => {
        // Run through the custom removals and additions to update the totals
        Object.keys(this.customRemovals).forEach(k => {
          k = extractIndices(k);
          let details = lookup[k.globalIndex];
          details.totalConnections -= 1;
          let offsetIndex = details.navigationOffsets.indexOf(k.globalOppIndex);
          if (offsetIndex !== -1) {
            details.navigationOffsets.splice(offsetIndex, 1);
          }
        });
        Object.keys(this.customConnections).forEach(k => {
          k = extractIndices(k);
          let details = lookup[k.globalIndex];
          details.totalConnections += 1;
          if (details.navigationOffsets.length < NUM_NAVIGATION_OFFSETS) {
            details.navigationOffsets.push(k.globalOppIndex);
          }
        });
      });
    }
    return resultPromise.then(() => {
      // Mark each item as finished
      indices.forEach(globalIndex => {
        lookup[globalIndex].stillCounting = false;
      });
    });
  }
}
JoinModel.PRESETS = {
  EQUIJOIN: 'EQUIJOIN',
  THETA_JOIN: 'THETA_JOIN',
  CROSS_PRODUCT: 'CROSS_PRODUCT',
  ORDERED_JOIN: 'ORDERED_JOIN',
  CONCATENATION: 'CONCATENATION'
};
JoinModel.STATUS = {
  FINISHED: 'FINISHED',
  COMPUTING: 'COMPUTING'
};
JoinModel.SIDE = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};
JoinModel.EXPRESSION_ERRORS = {
  NONE: 'NONE',
  EVALUATING: 'EVALUATING',
  EMPTY: 'EMPTY',
  MISSING_MODEL: 'MISSING_MODEL',
  SYNTAX: 'SYNTAX'
};

export default JoinModel;
