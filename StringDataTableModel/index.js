import DataTableModel from '../DataTableModel';

class StringDataTableModel extends DataTableModel {
  constructor (textContent) {
    super();
    this.textContent = textContent;
    // a very simple table; all the content can easily fit in memory
  }
  numChunks () {
    return 1;
  }
  nextChunk () {
    return this.textContent;
  }
}
export default StringDataTableModel;
