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
      let temp = this.parseChunk(this.textContent);
      this._rows = temp.parsedRecords;
      // the last record is never included in case the end of the chunk isn't
      // actually the end of the file (and maybe the next chunk contains a few
      // stray characters belonging to the previous line). So we have to add the
      // last record at this level, because only here do we know for sure that
      // the whole document has been processed
      this._rows.push(temp.values.map(v => v.value));
    }
    return this._rows;
  }
  fullScan (callback) {
    return new Promise((resolve, reject) => {
      callback({
        data: this.rows,
        globalStartIndex: 0,
        globalEndIndex: this.rows.length
      });
      resolve();
    });
  }
  getNativeIndex (i) {
    return i;
  }
  getItems (indices) {
    // force the lazy evaluation to happen now, or the allProperties() promise
    // will never be resolved
    let rows = this.rows;
    return this.allProperties().then(properties => {
      let results = [];
      indices.forEach(index => {
        let item = {};
        properties.forEach((p, i) => { item[p] = rows[index][i]; });
        results.push(item);
      });
      return results;
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
