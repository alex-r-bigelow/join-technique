import JoinModel from '../index';

class Concatenation extends JoinModel {
  countAllPresetConnections (indices, items, lookup, modelName, oppositeModel) {
    // There are no connections; for each item, numPresetConnections and
    // navigationOffsets are already correct (0 and empty)
    return Promise.resolve();
  }
  computeVisibleConnections () {
    return new Promise((resolve, reject) => {
      // The only connections that should show up are the custom ones
      this.computeVisibleCustomConnections();
      resolve();
    });
  }
}
export default Concatenation;
