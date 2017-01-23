import JoinableModel from '../JoinableModel';
import { IncrementalArray } from '../../lib/Incremental';

class DataTableModel extends JoinableModel {
  constructor (name) {
    super();
    this.requireProperties(['numChunks']);
    this.name = name;
    this.rows = new IncrementalArray();
  }
}

export default DataTableModel;
