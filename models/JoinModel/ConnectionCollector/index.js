import { IncrementalArray } from '../../../lib/Incremental';

class ConnectionCollector extends IncrementalArray {
  constructor (joinModel) {
    super();

    this.joinModel = joinModel;

    this.lookup = {};
    this.reverseLookup = {};

    this.passNumber = 0;
  }
  reset (hotSwap) {
    if (hotSwap !== true) {
      this.passNumber = 0;
    } else {
      this.passNumber += 1;
    }
    return super.reset(hotSwap);
  }
  setIndices (leftItems, rightItems) {
    this.setPopulateFunction((pop, fin) => {
      // First we want to add any connections between the new visible
      // elements, or update already-existing ones with the new pass number
      this.passNumber += 1;

      leftItems.forEach(l => {
        rightItems.forEach(r => {
          // TODO
        });
      });
    });
  }
  localScan () {

  }
}

ConnectionCollector.CUSTOM = 1;
ConnectionCollector.FULLY_VISIBLE = 2;
ConnectionCollector.PARTIALLY_VISIBLE = 3;
ConnectionCollector.NOT_VISIBLE = 4;

export default ConnectionCollector;
