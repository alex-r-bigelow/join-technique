import JoinModel from '../index';

class OrderedJoin extends JoinModel {
  countAllPresetConnections (indices, items, lookup, modelName, oppositeModel) {
    return new Promise((resolve, reject) => {
      indices.forEach((globalIndex, localIndex) => {
        // We already know the total count (1), and which connection to jump to just
        // by the global index number
        let details = lookup[globalIndex];
        details.totalConnections = 1;
        details.navigationOffsets = [globalIndex];
      });
      resolve();
    });
  }
  computeVisibleConnections () {
    return new Promise((resolve, reject) => {
      // First, add any custom connections
      this.computeVisibleCustomConnections();
      // Next, intersect the indices that we can see
      let temp = new Set(this.leftIndices);
      let commonIndices = this.rightIndices.filter(d => temp.has(d));
      // And now add connections as long as the user hasn't removed them
      commonIndices.forEach(globalIndex => {
        let connectionKey = globalIndex + '_' + globalIndex;
        if (!this.customRemovals[connectionKey]) {
          this.createVisibleConnection(globalIndex, globalIndex);
        }
      });
      resolve();
    });
  }
}
export default OrderedJoin;
