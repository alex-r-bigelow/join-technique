import sqlParser from 'sql-parser';
import sqlOpToFunction from '../../lib/sqlOpToFunction';
import ConnectionCollector from './ConnectionCollector';

class JoinModel {
  constructor (leftModel, rightModel) {
    this.leftModel = leftModel;
    this.rightModel = rightModel;
    this.currentPreset = JoinModel.CONCATENATION;
    this.onCondition = null;
    this.onConditionFunc = (itemsToCompare) => false;
    this.presetConnections = new ConnectionCollector(this);
    this.customConnections = [];
  }
  applyPreset (preset, onCondition) {
    if (this.currentPreset === preset && this.onCondition === onCondition) {
      return;
    }
    // First, interrupt if we're in the middle of calculating a different preset
    this.presetConnections.reset();

    this.currentPreset = preset;
    switch (preset) {
      case JoinModel.EQUIJOIN:
      case JoinModel.THETA_JOIN:
        if (!onCondition) {
          throw new Error('TODO: Have not yet implemented auto-detection of EQUIJOIN expressions');
        }
        this.onCondition = onCondition;
        this.onConditionFunc = sqlOpToFunction(sqlParser(onCondition));
        break;
      case JoinModel.CROSS_PRODUCT:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => true;
        break;
      case JoinModel.ORDERED_JOIN:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => {
          let keys = Object.keys(itemsToCompare);
          return itemsToCompare[keys[0]].index === itemsToCompare[keys[1]].index;
        };
        break;
      case JoinModel.CONCATENATION:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => false;
    }

    this.presetConnections.setPopulateFunction(this.getCollectionFunction());
  }
  getCollectionFunction () {
    // let leftItems = this.leftModel.getItems(leftIndices);
    // let rightItems = this.rightModel.getItems(rightIndices);
    return (pop, fin) => {
      // TODO
      fin();
    };
  }
}
JoinModel.EQUIJOIN = 'EQUIJOIN';
JoinModel.THETA_JOIN = 'THETA_JOIN';
JoinModel.CROSS_PRODUCT = 'CROSS_PRODUCT';
JoinModel.ORDERED_JOIN = 'ORDERED_JOIN';
JoinModel.CONCATENATION = 'CONCATENATION';

export default JoinModel;
