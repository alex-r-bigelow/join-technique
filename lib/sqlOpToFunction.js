import sqlParser from 'sql-parser';

let operations = {
  '<=': (x, y) => pairOfItems => x(pairOfItems) <= y(pairOfItems),
  '<': (x, y) => pairOfItems => x(pairOfItems) < y(pairOfItems),
  '>=': (x, y) => pairOfItems => x(pairOfItems) >= y(pairOfItems),
  '>': (x, y) => pairOfItems => x(pairOfItems) > y(pairOfItems),
  '=': (x, y) => pairOfItems => x(pairOfItems) === y(pairOfItems),
  '!=': (x, y) => pairOfItems => x(pairOfItems) !== y(pairOfItems)
};

function createValueExtractionFunction (obj) {
  if (obj instanceof sqlParser.nodes.Op) {
    return sqlOpToFunction(obj);
  } else if (obj instanceof sqlParser.nodes.StringValue ||
             obj instanceof sqlParser.nodes.NumberValue ||
             obj instanceof sqlParser.nodes.BooleanValue) {
    return pairOfItems => obj.value;
  } else if (obj instanceof sqlParser.nodes.LiteralValue) {
    if (obj.nested) {
      return pairOfItems => {
        let tableName = obj.value.value;
        if (!(tableName in pairOfItems)) {
          throw new Error('Error: couldn\'t find table ' + tableName + '; TODO: table aliases not yet supported.');
        } else {
          return pairOfItems[tableName].item[obj.value2];
        }
      };
    } else {
      throw new Error('TODO: Have not yet implemented functionality for literal values (try tablename.' + obj.value + ' instead?)');
    }
  } else {
    throw new Error('TODO: Have not yet implemented functionality for queries involving ' + obj.constructor.name);
  }
}

function sqlOpToFunction (op) {
  /* Convert a sql-parser-generated Op object into a function that can be called
     on actual data items (useful for both ON and WHERE). */

  let leftFunc = createValueExtractionFunction(op.left);
  let rightFunc = createValueExtractionFunction(op.right);
  if (!(op.operation in operations)) {
    throw new Error('TODO: Have not yet implemented functionality for queries involving ' + op.operation);
  }
  return operations[op.operation](leftFunc, rightFunc);
}

export default sqlOpToFunction;
