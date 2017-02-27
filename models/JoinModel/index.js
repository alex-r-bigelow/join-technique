import Model from '../../lib/Model';

class JoinModel extends Model {
  constructor (leftModel, rightModel, leftIndices, rightIndices, leftItems, rightItems) {
    super();
    this.requireProperties(['countAllPresetConnections', 'computeVisibleConnections']);
    this.leftModel = leftModel || null;
    this.rightModel = rightModel || null;

    leftIndices = leftIndices || [];
    rightIndices = rightIndices || [];
    leftItems = leftItems || [];
    rightItems = rightItems || [];

    // each of these is keyed by "globalLeftIndex_globalRightIndex"
    this.customConnections = {};
    this.customRemovals = {};

    this.startComputingConnections(leftIndices, rightIndices, leftItems, rightItems);
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
        // TODO: keep information from paused counting passes
        // olddetails = olddetails || {};
        let details = {};
        indices.forEach((globalIndex, localIndex) => {
          details[globalIndex] = {
            visiblePresetConnectionKeys: [],
            totalConnections: 0,
            stillCounting: true,
            navigationOffsets: [],
            scannedRanges: [],
            localIndex
          };
        });
        return details;
      }
      this.leftLookup = initLookup(this.leftLookup, this.leftIndices);
      this.rightLookup = initLookup(this.rightLookup, this.rightIndices);

      this.computeVisibleConnections().then(() => {
        this.visibleConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(JoinModel.SIDE.LEFT).then(() => {
        this.leftConnectionStatus = JoinModel.STATUS.FINISHED;
        this.trigger('update');
      });
      this.countAllConnections(JoinModel.SIDE.RIGHT).then(() => {
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
  createVisibleConnection (globalLeftIndex, globalRightIndex) {
    let connectionKey = globalLeftIndex + '_' + globalRightIndex;
    let leftItemDetails = this.leftLookup[globalLeftIndex];
    leftItemDetails.visiblePresetConnectionKeys.push(connectionKey);
    let rightItemDetails = this.rightLookup[globalRightIndex];
    rightItemDetails.visiblePresetConnectionKeys.push(connectionKey);
    this.visiblePresetConnections[connectionKey] = true;
  }
  computeVisibleCustomConnections () {
    Object.keys(this.customConnections).forEach(connectionKey => {
      let [globalLeftIndex, globalRightIndex] = connectionKey.split('_');
      globalLeftIndex = parseInt(globalLeftIndex);
      globalRightIndex = parseInt(globalRightIndex);
      if (this.leftIndices.indexOf(globalLeftIndex) !== -1 && this.rightIndices.indexOf(globalRightIndex)) {
        this.createVisibleConnection(globalLeftIndex, globalRightIndex);
      }
    });
  }
  countAllConnections (side) {
    let indices, items, lookup, modelName, oppositeModel, extractIndices;
    if (side === JoinModel.SIDE.LEFT) {
      if (this.leftModel === null) {
        return Promise.resolve(); // no model yet; nothing to count
      }
      indices = this.leftIndices;
      items = this.leftItems;
      lookup = this.leftLookup;
      modelName = this.leftModel.name;
      oppositeModel = this.rightModel;
      extractIndices = k => {
        let [left, right] = k.split('_');
        return {
          globalIndex: left,
          globalOppIndex: right
        };
      };
    } else {
      if (this.rightModel === null) {
        return Promise.resolve(); // no model yet; nothing to count
      }
      indices = this.rightIndices;
      items = this.rightItems;
      lookup = this.rightLookup;
      modelName = this.rightModel.name;
      oppositeModel = this.rightModel;
      extractIndices = k => {
        let [left, right] = k.split('_');
        return {
          globalOppIndex: left,
          globalIndex: right
        };
      };
    }
    let resultPromise;
    if (oppositeModel === null) {
      // okay, there are no connections to count, but this side at least should
      // be marked as finished
      resultPromise = Promise.resolve();
    } else {
      resultPromise = this.countAllPresetConnections(indices, items, lookup, modelName, oppositeModel);
      resultPromise = resultPromise.then(() => {
        // Run through the custom removals and additions to update the totals
        Object.keys(this.customRemovals).forEach(k => {
          k = extractIndices(k);
          let details = lookup[k.globalIndex];
          details.totalConnections -= 1;
          let offsetIndex = details.navigationOffsets.indexOf(k.globalOppIndex);
          if (offsetIndex !== -1) {
            details.navigationOffsets.splice(offsetIndex, 1);
          }
        });
        Object.keys(this.customConnections).forEach(k => {
          k = extractIndices(k);
          let details = lookup[k.globalIndex];
          details.totalConnections += 1;
          if (details.navigationOffsets.length < JoinModel.MAX_NAVIGATION_OFFSETS) {
            details.navigationOffsets.push(k.globalOppIndex);
          }
        });
      });
    }
    return resultPromise.then(() => {
      // Mark each item as finished
      indices.forEach(globalIndex => {
        lookup[globalIndex].stillCounting = false;
      });
    });
  }
}
JoinModel.MAX_NAVIGATION_OFFSETS = 5;
JoinModel.STATUS = {
  FINISHED: 'FINISHED',
  COMPUTING: 'COMPUTING'
};
JoinModel.SIDE = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};

export default JoinModel;
