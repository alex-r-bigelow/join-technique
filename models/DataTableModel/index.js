import JoinableModel from '../JoinableModel';

class DataTableModel extends JoinableModel {
  constructor (name) {
    super(name);
    this.requireProperties(['numChunks']);
  }
}

export default DataTableModel;
