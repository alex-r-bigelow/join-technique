import AbstractClass from '../../lib/AbstractClass';

class JoinableModel extends AbstractClass {
  constructor () {
    super();
    this.requireProperties(['fullScan', 'getItems', 'getNativeIndex', 'allProperties', 'numTotalItems']);
  }
}

export default JoinableModel;
