import Model from '../../lib/Model';
import sqlParser from 'sql-parser';
import sqlOpToFunction from '../../lib/sqlOpToFunction';
// let sideConnectionWorker = require('worker-loader!./sideConnectionWorker.js');

// TODO: remove these two debugging lines
window.sqlOpToFunction = sqlOpToFunction;
window.sqlParser = sqlParser;

let NUM_NAVIGATION_OFFSETS = 5;

class JoinModel extends Model {
  constructor (leftModel, rightModel) {
    super();
    this.leftModel = leftModel;
    this.rightModel = rightModel;

    this.currentPreset = JoinModel.PRESETS.CONCATENATION;
    this.onCondition = null;
    this.onConditionFunc = (itemsToCompare) => false;

    // each of these is keyed by "globalLeftIndex_globalRightIndex"
    this.customConnections = {};
    this.customRemovals = {};

    this.startComputingConnections([], [], [], []);
  }
  startComputingConnections (leftIndices, rightIndices, leftItems, rightItems) {
    return this.pauseWebWorkers().then(() => {
      this.leftIndices = leftIndices;
      this.rightIndices = rightIndices;
      this.leftItems = leftItems;
      this.rightItems = rightItems;
      this.visiblePresetConnections = {};
      this.visibleConnectionStatus = JoinModel.STATUS.COMPUTING;
      this.leftConnectionStatus = JoinModel.STATUS.COMPUTING;
      this.rightConnectionStatus = JoinModel.STATUS.COMPUTING;

      function initLookup (olddetails, indices) {
        olddetails = olddetails || {};
        let details = {};
        indices.forEach(globalIndex => {
          details[globalIndex] = {
            visiblePresetConnectionKeys: [],
            numPresetConnections: 0,
            navigationOffsets: [],
            scannedRanges: []
          };
        });
        return details;
      }
      this.leftLookup = initLookup(this.leftLookup, this.leftIndices);
      this.rightLookup = initLookup(this.rightLookup, this.rightIndices);

      let leftName = this.leftModel ? this.leftModel.name : null;
      let rightName = this.rightModel ? this.rightModel.name : null;

      this.computeVisibleConnections().then(() => {
        this.visibleConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(this.leftIndices, this.leftItems, this.leftLookup, leftName, this.rightModel).then(() => {
        this.leftConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(this.rightIndices, this.rightItems, this.rightLookup, rightName, this.leftModel).then(() => {
        this.rightConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
    });
  }
  changeFocusItems (leftIndices, rightIndices) {
    let leftItems = this.leftModel ? this.leftModel.getItems(leftIndices) : Promise.resolve([]);
    let rightItems = this.rightModel ? this.rightModel.getItems(rightIndices) : Promise.resolve([]);
    Promise.all([leftItems, rightItems])
      .then(([leftItems, rightItems]) => {
        this.startComputingConnections(leftIndices, rightIndices, leftItems, rightItems);
      });
  }
  changePreset (preset, onCondition) {
    if (this.currentPreset === preset && this.onCondition === onCondition) {
      // Nothing is actually changing... so we can leave things as they were
      return;
    }
    this.currentPreset = preset;
    switch (preset) {
      case JoinModel.PRESETS.EQUIJOIN:
      case JoinModel.PRESETS.THETA_JOIN:
        if (!onCondition) {
          throw new Error('TODO: Have not yet implemented auto-inference of join expressions');
        }
        this.onCondition = onCondition;
        this.onConditionFunc = sqlOpToFunction(sqlParser(onCondition));
        break;
      case JoinModel.PRESETS.CROSS_PRODUCT:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => true;
        break;
      case JoinModel.PRESETS.ORDERED_JOIN:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => {
          let keys = Object.keys(itemsToCompare);
          return itemsToCompare[keys[0]].index === itemsToCompare[keys[1]].index;
        };
        break;
      case JoinModel.PRESETS.CONCATENATION:
        this.onCondition = null;
        this.onConditionFunc = (itemsToCompare) => false;
        break;
      default:
        throw new Error('Unknown preset: ' + this.currentPreset);
    }
    this.startComputingConnections(this.leftIndices, this.rightIndices, this.leftItems, this.rightItems);
  }
  pauseWebWorkers () {
    // TODO
    return Promise.resolve();
  }
  indexInRanges (index, ranges) {
    let inrange = false;
    ranges.some(range => {
      inrange = index >= range.low && index < range.high;
      return inrange;
    });
    return inrange;
  }
  addIndexToRange (index, ranges) {
    let added = false;
    ranges.some(range => {
      if (index === range.low - 1) {
        range.low -= 1;
        added = true;
      } else if (index === range.high) {
        range.high += 1;
        added = true;
      } else if (index >= range.low && index < range.high) {
        added = true;
      }
      return added;
    });
    if (!added) {
      ranges.push({
        low: index,
        high: index + 1
      });
    }
  }
  computeVisibleConnections () {
    return new Promise((resolve, reject) => {
      this.leftIndices.forEach((globalLeftIndex, localLeftIndex) => {
        this.rightIndices.forEach((globalRightIndex, localRightIndex) => {
          let itemsToCompare = {};
          itemsToCompare[this.leftModel.name] = {
            index: globalLeftIndex,
            item: this.leftItems[localLeftIndex]
          };
          itemsToCompare[this.rightModel.name] = {
            index: globalRightIndex,
            item: this.rightItems[localRightIndex]
          };
          if (this.onConditionFunc(itemsToCompare)) {
            let connectionKey = globalLeftIndex + '_' + globalRightIndex;
            let leftItemDetails = this.leftLookup[globalLeftIndex];
            leftItemDetails.visiblePresetConnectionKeys.push(connectionKey);
            let rightItemDetails = this.rightLookup[globalRightIndex];
            rightItemDetails.visiblePresetConnectionKeys.push(connectionKey);
            this.visiblePresetConnections[connectionKey] = true;
          }
        });
      });
      resolve();
    });
  }
  countAllConnections (indices, items, lookup, modelName, oppositeModel) {
    switch (this.currentPreset) {
      case JoinModel.PRESETS.EQUIJOIN:
      case JoinModel.PRESETS.THETA_JOIN:
        // Attribute-based presets require a full table scan
        return oppositeModel.fullScan(chunk => {
          // TODO: do this behind the scenes in a web worker so it doesn't lock up the UI
          chunk.data.forEach((oppItem, localOppIndex) => {
            let globalOppIndex = localOppIndex + chunk.globalStartIndex;
            indices.forEach((globalIndex, localIndex) => {
              let itemsToCompare = {};
              itemsToCompare[modelName] = {
                index: globalIndex,
                item: items[localIndex]
              };
              itemsToCompare[oppositeModel.name] = {
                index: globalOppIndex,
                item: oppItem
              };
              let details = lookup[globalIndex];
              if (!this.indexInRanges(globalOppIndex, details.scannedRanges) &&
                  this.onConditionFunc(itemsToCompare)) {
                details.numPresetConnections += 1;
                if (details.navigationOffsets.length < NUM_NAVIGATION_OFFSETS) {
                  details.navigationOffsets.push(globalOppIndex);
                }
              }
            });
          });
          // TODO: Incrementally update the interface
          // this.trigger('update');
        });
      case JoinModel.PRESETS.CROSS_PRODUCT:
        // We already know the total count (the size of all items in the opposite set)
        return oppositeModel.numTotalItems().then(count => {
          indices.forEach((globalIndex, localIndex) => {
            let details = lookup[globalIndex];
            details.numPresetConnections = count;
            details.navigationOffsets = []; // including offsets is kind of pointless...
          });
        });
      case JoinModel.PRESETS.ORDERED_JOIN:
        // We already know the total count (1), and which connection to jump to just
        // by the global index number
        return new Promise((resolve, reject) => {
          indices.forEach((globalIndex, localIndex) => {
            let details = lookup[globalIndex];
            details.numPresetConnections = 1;
            details.navigationOffsets = [globalIndex];
          });
          resolve();
        });
      case JoinModel.PRESETS.CONCATENATION:
        // There are no connections; numPresetConnections and navigationOffsets are already
        // correct (0 and empty)
        return Promise.resolve();
      default:
        throw new Error('Unknown preset: ' + this.currentPreset);
    }
  }
}
JoinModel.PRESETS = {
  EQUIJOIN: 'EQUIJOIN',
  THETA_JOIN: 'THETA_JOIN',
  CROSS_PRODUCT: 'CROSS_PRODUCT',
  ORDERED_JOIN: 'ORDERED_JOIN',
  CONCATENATION: 'CONCATENATION'
};
JoinModel.STATUS = {
  FINISHED: 'FINISHED',
  COMPUTING: 'COMPUTING'
};

export default JoinModel;
