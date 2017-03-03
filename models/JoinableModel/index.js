import Model from '../../lib/Model';

class JoinableModel extends Model {
  constructor (name) {
    super();
    this.requireProperties(['fullScan', 'getItems', 'allProperties', 'numTotalItems']);
    this.name = name;
  }
  getNativeIndex (i) {
    return i;
  }
}

export default JoinableModel;
