import DataTableModel from '..';

const CHUNK_BYTE_SIZE = 102400; // read files 100K at a time

class FileTable extends DataTableModel {
  constructor (fileObj) {
    super(fileObj.name);

    // A mixin should be used to give us a parseChunk function and settings object
    let requiredMethods = ['parseChunk', 'settings'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError(m + ' not defined for FileTable.');
      }
    });

    this.fileObj = fileObj;
    this.currentByteOffset = 0;
    this.rowOffsets = {};

    this.rows.setPopulateFunction(incArr => {
      // Figure out what the last complete row number was
      let lastRowNumber = this.rows.currentContents.length + (this.rowOffsets[this.currentOffset] || 0);
      // Get the next chunk of data
      let currentChunk = this.fileObj.slice(this.currentOffset, this.currentOffset + CHUNK_BYTE_SIZE);
      // TODO... there's some mess here involving partial rows...
      // Also should cal pur() to clean out old data that we don't have space for anymore
    }).then(() => {
      this.rows.startPopulating();
    });
  }
  updateSettings (settings) {
    // this.settings will be defined by the mixin
    for (let key in settings) {
      this.settings[key] = settings[key];
    }
    // Reset the rows so they're parsed freshly
    this.rows.reset();
  }
  fullScan (callback) {
    // TODO: fire callbacks for every row
  }
  getNativeIndex () {
    // TODO
  }
  getItems (indices) {
    // TODO
  }
  allProperties () {
    // TODO
  }
  numTotalItems () {
    // TODO
  }
  numChunks () {
    // TODO
  }
}

export default FileTable;
