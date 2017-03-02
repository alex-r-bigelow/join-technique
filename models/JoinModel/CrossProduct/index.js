import JoinModel from '../index';

class CrossProduct extends JoinModel {
  countAllConnections (indices, items, lookup, modelName, oppositeModel) {
    // We already know the total count (the size of all items in the opposite set)
    return oppositeModel.numTotalItems().then(count => {
      indices.forEach((globalIndex, localIndex) => {
        let details = lookup[globalIndex];
        details.totalConnections = count;
        details.navigationOffsets = []; // including offsets is kind of pointless, so don't bother
      });
    });
  }
  computeVisibleConnections () {
    return new Promise((resolve, reject) => {
      this.leftIndices.forEach((globalLeftIndex, localLeftIndex) => {
        this.rightIndices.forEach((globalRightIndex, localRightIndex) => {
          let connectionKey = globalLeftIndex + '_' + globalRightIndex;
          // Connect everything unless the user has specifically removed the connection
          if (!this.customRemovals[connectionKey]) {
            this.createVisibleConnection(globalLeftIndex, globalRightIndex);
          }
        });
      });
      resolve();
    });
  }
}
export default CrossProduct;
