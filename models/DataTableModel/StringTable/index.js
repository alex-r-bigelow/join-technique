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

    this.textContent = textContent;
    this._rows;
  }
  get rows () {
    // A string table is small enough that it can fit in memory... but we won't
    // have the parsing settings from the mixin in the constructor. So we
    // pre-parse the whole thing lazily when the contents are needed
    if (!this._rows) {
      this._rows = this.parseChunk(this.textContent).parsedRecords;
    }
    return this._rows;
  }
  fullScan (callback) {
    callback({
      data: this.rows,
      globalStartIndex: 0,
      globalEndIndex: this.rows.length
    });
  }
  getNativeIndex (i) {
    return i;
  }
  getItems (indices) {
    return new Promise((resolve, reject) => {
      let results = [];
      indices.forEach(index => {
        results.push(this.rows[index]);
      });
      resolve(results);
    });
  }
  numTotalItems () {
    return Promise.resolve(this.rows.length);
  }
  numChunks () {
    return 1;
  }
}
export default StringTable;
