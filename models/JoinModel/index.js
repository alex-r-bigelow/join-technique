import sqlParser from 'sql-parser';
import sqlOpToFunction from '../../lib/sqlOpToFunction';
import { IncrementalArray } from '../../lib/Incremental';
import Connection from './Connection';

class JoinModel {
  constructor (leftModel, rightModel) {
    this.leftModel = leftModel;
    this.rightModel = rightModel;
    this.leftIndices = [];
    this.rightIndices = [];
    this.leftItems = [];
    this.rightItems = [];
    this.currentPreset = JoinModel.CONCATENATION;
    this.onCondition = null;
    this.onConditionFunc = (itemsToCompare) => false;
    this.presetConnections = new IncrementalArray();
    this.customConnections = [];
    this.connectionLookup = {};
  }
  changeFocusItems (leftIndices, rightIndices) {
    this.presetConnections.pause();
    Promise.all([this.leftModel.getItems(leftIndices),
                 this.rightModel.getItems(rightIndices)])
      .then(([leftItems, rightItems]) => {
        this.leftIndices = leftIndices;
        this.rightIndices = rightIndices;
        this.leftItems = leftItems;
        this.rightItems = rightItems;
        // We've just changed the visible items; old results are still valid,
        // so just do a hot swap instead of a full reset
        this.presetConnections.reset(true);
      });
  }
  changePreset (preset, onCondition) {
    if (this.currentPreset === preset && this.onCondition === onCondition) {
      // Nothing is actually changing... so we can leave things as they were
      return;
    }
    // First, interrupt if we're in the middle of calculating a different preset
    this.presetConnections.pause();
    this.connectionLookup = {};

    this.currentPreset = preset;
    let popFunc;
    switch (preset) {
      case JoinModel.EQUIJOIN:
      case JoinModel.THETA_JOIN:
        if (!onCondition) {
          throw new Error('TODO: Have not yet implemented auto-inference of join expressions');
        }
        this.onCondition = onCondition;
        this.onConditionFunc = sqlOpToFunction(sqlParser(onCondition));
        popFunc = this.thetaJoin;
        break;
      case JoinModel.CROSS_PRODUCT:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => true;
        popFunc = this.crossProduct;
        break;
      case JoinModel.ORDERED_JOIN:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => {
          let keys = Object.keys(itemsToCompare);
          return itemsToCompare[keys[0]].index === itemsToCompare[keys[1]].index;
        };
        popFunc = this.orderedJoin;
        break;
      case JoinModel.CONCATENATION:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => false;
        popFunc = this.concatenation;
    }
    this.presetConnections
      .setPopulateFunction(incArr => {
        return popFunc(incArr);
      }).then(() => {
        this.presetConnections.startPopulating();
      });
  }
  connect (incArr, leftIndex, rightIndex) {
    let connectionKey = leftIndex + rightIndex;
    if (this.connectionLookup[connectionKey] === undefined) {
      this.connectionLookup[connectionKey] = incArr.currentContents.length;
      let newConnection = new Connection(leftIndex, this.leftItems[leftIndex], rightIndex, this.rightItems[rightIndex]);
      return incArr.currentContents.populate([newConnection]);
      /*
      TODO: we should actually flag existing items as being "new" if we try to
      add them again; otherwise, these items might get discarded prematurely.
      This probably requires an architectural change of how IncrementalArray
      throws away old values, and may or may not be helped if we only populate
      in a chunked way
      */
    }
    return true;
  }
  thetaJoin (incArr) {
    // TODO
  }
  crossProduct (incArr) {
    // First, create connections between the visible items
    this.leftIndices.forEach(li => {
      this.rightIndices.forEach(ri => {
        if (!this.connect(incArr, li, ri)) {
          return;
        }
      });
    });

    // Now just add connections numerically
    Promise.all([this.leftModel.numTotalItems(), this.rightModel.numTotalItems()])
      .then(counts => {
        for (let i = 0; i < counts[0]; i += 1) {
          for (let j = 0; j < counts[1]; j += 1) {
            if (!this.connect(incArr, i, j)) {
              return;
            }
          }
        }
        incArr.finish();
      });
  }
  orderedJoin (incArr) {
    // First, create connections between the visible items
    this.leftIndices.forEach(li => {
      this.rightIndices.forEach(ri => {
        if (li === ri) {
          if (!this.connect(incArr, li, ri)) {
            return;
          }
        }
      });
    });

    // Now just add connections numerically
    Promise.all([this.leftModel.numTotalItems(), this.rightModel.numTotalItems()])
      .then(counts => {
        for (let i = 0; i < Math.min(...counts); i += 1) {
          if (!this.connect(incArr, i, i)) {
            return;
          }
        }
        incArr.finish();
      });
  }
  concatenation (incArr) {
    // There are no predefined topological connections when
    // concatenating tables
    incArr.finish();
  }
}
JoinModel.EQUIJOIN = 'EQUIJOIN';
JoinModel.THETA_JOIN = 'THETA_JOIN';
JoinModel.CROSS_PRODUCT = 'CROSS_PRODUCT';
JoinModel.ORDERED_JOIN = 'ORDERED_JOIN';
JoinModel.CONCATENATION = 'CONCATENATION';

export default JoinModel;
