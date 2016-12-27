class JoinModel {
  constructor (leftModel, rightModel) {
    this.leftModel = leftModel;
    this.rightModel = rightModel;
    this.connectionsFromLeft = {};
    this.connectionsFromRight = {};
  }
  purgeAllConnections () {
    this.connectionsFromLeft = {};
    this.connectionsFromRight = {};
  }
  connect (leftIndex, rightIndex) {
    if (!(leftIndex in this.connectionsFromLeft)) {
      this.connectionsFromLeft[leftIndex] = [];
    }
    if (!(rightIndex in this.connectionsFromRight)) {
      this.connectionsFromRight[leftIndex] = [];
    }
    this.connectionsFromLeft[leftIndex].push(rightIndex);
    this.connectionsFromRight[rightIndex].push(leftIndex);
  }
  disconnect (leftIndex, rightIndex) {
    if (this.connectionsFromLeft[leftIndex]) {
      this.connectionsFromLeft.splice(this.connectionsFromLeft.indexOf(leftIndex), 1);
      if (this.connectionsFromLeft.length === 0) {
        delete this.connectionsFromLeft[leftIndex];
      }
    }
    if (this.connectionsFromRight[rightIndex]) {
      this.connectionsFromRight.splice(this.connectionsFromRight.indexOf(rightIndex), 1);
      if (this.connectionsFromRight.length === 0) {
        delete this.connectionsFromRight[rightIndex];
      }
    }
  }
}

export default JoinModel;
