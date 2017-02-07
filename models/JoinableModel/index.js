import Model from '../../lib/Model';

class JoinableModel extends Model {
  constructor (name) {
    super();
    this.requireProperties(['fullScan', 'getItems', 'getNativeIndex', 'allProperties', 'numTotalItems']);
    this.name = name;
  }
}

export default JoinableModel;
