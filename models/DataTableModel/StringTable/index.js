import DataTableModel from '..';

class StringTable extends DataTableModel {
  constructor (name, textContent) {
    super(name);

    // This is an abstract class; we require that these methods be implemented
    let requiredMethods = ['parseChunk'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError('Must override ' + m + ' method');
      }
    });

    // A string table is small enough that it can fit in memory... so pre-parse the whole thing
    this.textContent = textContent;
    this.rows.setPopulateFunction(incArr => {
      let chunkState = this.parseChunk(this.textContent);
      incArr.populate(chunkState.parsedRecords);
      incArr.finish();
    }).then(() => {
      this.rows.startPopulating();
    });
  }
  fullScan (callback) {
    this.rows.contents.then(rows => {
      rows.forEach(callback);
    });
  }
  getNativeIndex (i) {
    return i;
  }
  getItems (indices) {
    return this.rows.contents.then(rows => {
      let results = [];
      indices.forEach(index => {
        results.nativeIndices[results.rows.length] = index;
        results.rows.push(rows[index]);
      });
      return indices;
    });
  }
  allProperties () {
    return this.rows.contents.then(rows => {
      return this.parsedHeaders;
    });
  }
  numTotalItems () {
    return this.rows.contents.then(rows => {
      return rows.length;
    });
  }
  numChunks () {
    return 1;
  }
}
export default StringTable;
