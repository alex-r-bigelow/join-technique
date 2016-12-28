import sqlOpToFunction from '../lib/sqlOpToFunction';

class JoinModel {
  constructor (leftModel, rightModel) {
    this.leftModel = leftModel;
    this.rightModel = rightModel;
    this.connectionsFromLeft = {};
    this.connectionsFromRight = {};
    this.currentPreset = JoinModel.CONCATENATION;
    this.joinOnTestFunction = null;
  }
  applyPreset (preset, onCondition) {
    this.currentPreset = preset;
    this.joinOnTestFunction = onCondition ? sqlOpToFunction(onCondition) : null;
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
  presetDefinesConnection (leftIndex, rightIndex) {
    switch (this.currentPreset) {
      case JoinModel.EQUIJOIN:
      case JoinModel.THETA_JOIN:
        return Promise.all([this.leftModel.getItem(leftIndex), this.rightModel.getItem(rightIndex)])
          .then((leftItem, rightItem) => {
            let rows = {};
            rows[this.leftModel.name] = leftItem;
            rows[this.rightModel.name] = rightItem;
            return this.joinOnTestFunction(rows);
          });
      case JoinModel.CROSS_PRODUCT: return Promise.resolve(true);
      case JoinModel.ORDERED_JOIN: return Promise.resolve(leftIndex === rightIndex);
      case JoinModel.CONCATENATION: return Promise.resolve(false);
    }
  }
}
JoinModel.EQUIJOIN = 'EQUIJOIN';
JoinModel.THETA_JOIN = 'THETA_JOIN';
JoinModel.CROSS_PRODUCT = 'CROSS_PRODUCT';
JoinModel.ORDERED_JOIN = 'ORDERED_JOIN';
JoinModel.CONCATENATION = 'CONCATENATION';

export default JoinModel;
