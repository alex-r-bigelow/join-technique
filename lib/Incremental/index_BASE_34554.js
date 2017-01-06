class Incremental {
  constructor (populateFunction) {
    this.contentsPromise = null;
    this.finished = false;
    this.error = null;
    this.continueRunning = true;
    this.populateFunction = populateFunction || function (pop, fin, pur) {
      // If no populateFunction is supplied, initially start with
      // one that does nothing (note that this leaves it in an
      // unfinished state)
    };
    // this.resolutionFunction should be overridden before it's ever called...
    this.resolutionFunction = null;
    this.eventHandlers = [];
  }
  startPopulating () {
    this.contents.then();
  }
  get contents () {
    if (this.contentsPromise !== null) {
      if (this.continueRunning === true) {
        return this.contentsPromise;
      } else {
        // We're in the middle of a reset; return a promise that will eventually
        // call this getter again to obtain the new contentsPromise, once
        // everything is ready
        let finish = () => {
          return this.contents;
        };
        return this.contentsPromise.then(finish, finish);
      }
    } else {
      this.contentsPromise = new Promise((resolve, reject) => {
        // Run the function that will populate the array
        this.resolutionFunction = resolve;
        let response;
        // TODO: once the project is more stable, uncomment the
        // try/catch block so that users are notified of errors
        // try {
        response = this.populateFunction(
          () => { this.populate(...arguments); },
          () => { this.finish(...arguments); },
          () => { this.purge(...arguments); });
        if (response) {
          this.finish();
        }
        // } catch (e) {
        //  this.error = e;
        // }
      });
      return this.contentsPromise;
    }
  }
  get currentContents () {
    return this._contents;
  }
  get status () {
    if (this.error !== null) {
      return Incremental.ERROR;
    } else if (this.contentsPromise === null) {
      return Incremental.UNINITIALIZED;
    } else if (this.finished === false) {
      if (this.continueRunning === true) {
        return Incremental.RUNNING;
      } else {
        return Incremental.INTERRUPTED;
      }
    } else {
      return Incremental.FINISHED;
    }
  }
  finish () {
    this.finished = true;
    this.continueRunning = false;
    this.resolutionFunction(this._contents);
  }
  purge () {
    // A light purge of the contents (the current populateFunction will
    // continue running)
    this._purgeContents();
  }
  reset (hotSwap) {
    // Resetting clears any previous error
    this.error = null;
    if (hotSwap !== true) {
      // By default, reset() invalidates anything we've collected up to this
      // point. However, we allow the user to "hot swap" a different function
      // in that just builds on what the previous function did. In this event,
      // the user is responsible for making sure that the array of contents
      // produced by two different function is valid
      this._purgeContents();
    }
    this.continueRunning = false;
    this.finished = false;
    if (this.contentsPromise !== null) {
      // The contentsPromise will eventually terminate... when it does (regardless
      // of its outcome), finish restoring to the UNINITIALIZED state.
      let finish = () => {
        this.continueRunning = true;
        this.contentsPromise = null;
        return null;
      };
      // We return a promise to let the caller know when we've finished
      // interrupting the process
      return this.contentsPromise.then(finish, finish);
    } else {
      // We're not waiting on a promise to finish, so we can restore to
      // UNINITIALIZED state immediately
      this.continueRunning = true;
      return Promise.resolve(null);
    }
  }
  setPopulateFunction (f, hotSwap) {
    if (f !== this.populateFunction) {
      return this.reset(hotSwap).then(() => {
        this.populateFunction = f;
        return this.populateFunction;
      });
    } else {
      return Promise.resolve(this.populateFunction);
    }
  }
  _dispatchUpdateEvent (latestUpdate) {
    let event = new window.CustomEvent('update', {
      detail: latestUpdate
    });
    this.eventHandlers.forEach(callback => {
      callback(event);
    });
  }
  on (eventName, callback) {
    if (eventName !== 'update') {
      throw new Error('Can\'t listen to undefined event: ' + eventName);
    }
    this.eventHandlers.push(callback);
  }
}
Incremental.UNINITIALIZED = 'UNINITIALIZED';
Incremental.RUNNING = 'RUNNING';
Incremental.INTERRUPTED = 'INTERRUPTED';
Incremental.FINISHED = 'FINISHED';
Incremental.ERROR = 'ERROR';

class IncrementalArray extends Incremental {
  constructor () {
    super(...arguments);
    this._contents = [];
  }
  _purgeContents () {
    this._contents = [];
  }
  get currentLength () {
    return this._contents.length;
  }
  populate (contents) {
    if (this.continueRunning && this.error === null) {
      this._contents = this._contents.concat(contents);
    }
    this._dispatchUpdateEvent(contents);
    return this.continueRunning && this.error === null;
  }
}

class IncrementalMap extends Incremental {
  constructor () {
    super(...arguments);
    this._contents = new Map();
  }
  _purgeContents () {
    this._contents = new Map();
  }
  get currentSize () {
    return this._contents.size;
  }
  populate (contents) {
    if (this.continueRunning && this.error === null) {
      this._contents = new Map([...this._contents, ...contents]);
    }
    this._dispatchUpdateEvent(contents);
    return this.continueRunning && this.error === null;
  }
}

export { IncrementalArray, IncrementalMap };
export default Incremental;
