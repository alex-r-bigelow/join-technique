class DataTableModel {
  constructor () {
    // This is an abstract class; we require that these methods be implemented:
    let requiredMethods = ['nextChunk', 'numChunks'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError('Must override ' + m + ' method');
      }
    });

    this._parsedRecords = null;
    this._partialRecord = null;
    this.parseProgress = null;

    this.mode = DataTableModel.DSV_MODE;

    this.name = 'Untitled Table';

    this.dsvSettings = {
      delimiters: [','],
      quoteChar: '"',
      escapeChar: '\\',
      lineBreakChars: ['\n'],
      mergeConsecutiveDelimiters: false,
      columnHeaders: 1
    };
    // When columnHeaders is an integer, it means that the first n lines are used as the
    // column headers (and that those headers have not yet been fully parsed).
    // Otherwise, this is an array (could be the result of parsing, or user-supplied).

    // This is an array of positions to slice at
    this.fixedWidthSettings = [];

    // jsonPath points to the array that we want to load as a table
    this.jsonSettings = {
      jsonPath: '$'
    };

    // xpath points to the array that we want to load as a table
    this.xmlSettings = {
      xpath: '//'
    };
  }
  get parsedRecords () {
    return new Promise((resolve, reject) => {
      if (this._parsedRecords !== null) {
        resolve(this._parsedRecords);
      } else {
        this.parse(resolve, errorMessage => {
          // parsing failed for some reason; interrupt further parsing
          // before we pass along the error message
          this.interrupt();
          reject(errorMessage);
        });
      }
    });
  }
  interrupt () {
    this._parsedRecords = null;
    this._partialRecord = null;
    this._parseProgress = null;
  }
  parse (successCallback, failureCallback) {
    this._parsedRecords = [];
    this._partialRecord = null;
    let state;
    for (this.parseProgress = 0; this.parseProgress < this.numChunks(); this.parseProgress += 1) {
      if (this._parsedRecords === null) {
        // Something interrupted the process; we should stop parsing
        // (no need to send an additional "interrupted" failure message - there will
        // either be another error message that caused this interruption, or the
        // process trying to get at the parsed content will have deliberately
        // interrupted this itself)
        return;
      }
      let chunk = this.nextChunk();
      try {
        if (this.mode === DataTableModel.DSV_MODE) {
          state = this.parseDsvChunk(chunk, state);
        } else if (this.mode === DataTableModel.FIXED_WIDTH_MODE) {
          state = this.parseFixedWithChunk(chunk, state);
        } else if (this.mode === DataTableModel.JSON_MODE) {
          state = this.parseJsonChunk(chunk, state);
        } else if (this.mode === DataTableModel.XML_MODE) {
          state = this.parseXmlChunk(chunk, state);
        } else {
          throw new Error('Error parsing: unknown mode');
        }
      } catch (e) {
        failureCallback(e.message);
      }
    }
    successCallback(this._parsedRecords);
  }
  nextDsvValue (index, chunk, oldState) {
    // Look ahead until we see a delimiter, unescaped line break,
    // or the end of the chunk
    let state = oldState || {
      value: '',
      quoted: false,
      escapeNextChar: false,
      finished: false
    };
    while (true) {
      if (index >= chunk.length) {
        // the value was (potentially) split in two by the end of the chunk;
        // return the full state object so that we can pick up where we left off
        return state;
      }
      if (!state.escapeNextChar) {
        if (!state.quoted) {
          if (this.dsvSettings.delimiters.indexOf(chunk[index]) !== -1 ||
              this.dsvSettings.lineBreakChars.indexOf(chunk[index]) !== -1) {
            // Finished a value
            state.finished = true;
            return state;
          }
        } else if (chunk[index] === this.dsvSettings.quoteChar) {
          state.quoted = !state.quoted;
        } else if (chunk[index] === this.dsvSettings.escapeChar) {
          state.escapeNextChar = true;
        } else {
          state.escapeNextChar = false;
          state.value += chunk[index];
        }
      } else {
        state.escapeNextChar = false;
        state.value += chunk[index];
      }
      index += 1;
    }
  }
  getDsvHeaders (index, chunk, oldState) {
    if (this.dsvSettings.columnHeaders instanceof Array) {
      // If the user has predefined the headers, just return those
      return {
        headers: this.dsvSettings.columnHeaders,
        finished: true,
        numHeaders: this.dsvSettings.columnHeaders.length
      };
    }
    let state = oldState || {
      row: 0,
      headers: [],
      finished: false,
      numHeaders: 0
    };
    state.index = index;
    // starting a new chunk, so even oldState should start at index (in that case,
    // index will be zero)

    // check if we have a split value that we're starting with...
    let oldValue = null;
    if (state.headers.length > 0 && state.headers[state.headers.length - 1].finished === false) {
      oldValue = state.headers.pop();
    }
    while (true) {
      let current = this.nextDsvValue(index, chunk, oldValue);
      oldValue = null;
      state.headers.push(current);
      state.index += current.value.length;
      if (!current.finished || index >= chunk.length) {
        // we got a split value back; this also means that
        // the rest of the header is in another chunk
        return state;
      }
      // Okay, now we know that we've added a finished value; increment
      // the count of total headers if we're on the first row
      if (state.row === 0) {
        state.numHeaders += 1;
      }
      // Move forward a character to skip the delimiter or newline
      let newline = this.dsvSettings.lineBreakChars.indexOf(chunk[state.index]) !== -1;
      state.index += 1;
      while (this.dsvSettings.mergeConsecutiveDelimiters) {
        // chew up any consecutive delimiters
        if (state.index >= chunk.length) {
          break;
        } else if (this.devSettings.lineBreakChars.indexOf(chunk[state.index] !== -1)) {
          newline = true;
          break;
        } else if (this.devSettings.delimiters.indexOf(chunk[state.index]) === -1) {
          break;
        }
        state.index += 1;
      }
      if (newline) {
        // That was a newline...
        state.row += 1;
        if (state.row >= this.dsvSettings.columnHeaders) {
          // we've finished extracting all the headers
          state.finished = true;
          // if there was more than one row, we'll need to stitch each chunk together
          let temp = [];
          state.headers.forEach((h, i) => {
            i = i % state.numHeaders;
            if (temp.length >= i) {
              temp.push('');
            }
            if (temp[i].length > 0) {
              temp[i] += '\n';
            }
            temp[i] += h;
          });
          state.headers = temp;
          return state;
        }
      }
    }
  }
  parseDsvChunk (chunk, oldState) {
    let index = 0;
    if (!(this.dsvSettings.columnHeaders instanceof Array)) {
      let headerState = this.getDsvHeaders(index, oldState);
      if (headerState.finished === false) {
        return headerState;
      } else {
        this.dsvSettings.columnHeaders = headerState.headers;
        index = headerState.index;
      }
    }
    let state = oldState || {
      values: [],
      finished: false
    };
    state.index = index;
    // starting a new chunk, so even oldState should start at index (in that case,
    // index will be zero)

    // check if we have a split value that we're starting with...
    let oldValue = null;
    if (state.values.length > 0 && state.values[state.values.length - 1].finished === false) {
      oldValue = state.values.pop();
    }
    while (true) {
      let current = this.nextDsvValue(index, chunk, oldValue);
      oldValue = null;
      state.values.push(current);
      state.index += current.value.length;
      if (!current.finished || index >= chunk.length) {
        // we got a split value back or we finished the chunk
        return state;
      }
      // Move forward a character to skip the delimiter or newline
      let newline = this.dsvSettings.lineBreakChars.indexOf(chunk[state.index]) !== -1;
      state.index += 1;
      while (this.dsvSettings.mergeConsecutiveDelimiters) {
        // chew up any consecutive delimiters
        if (state.index >= chunk.length) {
          break;
        } else if (this.devSettings.lineBreakChars.indexOf(chunk[state.index] !== -1)) {
          newline = true;
          break;
        } else if (this.devSettings.delimiters.indexOf(chunk[state.index]) === -1) {
          break;
        }
        state.index += 1;
      }
      if (newline) {
        // That was a newline; the row should be finished
        let newRecord = {};
        this.dsvSettings.columnHeaders.forEach((h, i) => {
          newRecord[h] = state.values[i];
        });
        this._parsedRecords.push(newRecord);
        state.values = [];
      }
    }
  }
  parseFixedWithChunk (chunk, oldState) {
    throw new Error('Error: fixed width data is not yet supported');
  }
  parseJsonChunk (chunk, oldState) {
    throw new Error('Error: JSON data is not yet supported');
  }
  parseXmlChunk (chunk, oldState) {
    throw new Error('Error: XML data is not yet supported');
  }
}
DataTableModel.DSV_MODE = 0;
DataTableModel.FIXED_WIDTH_MODE = 1;
DataTableModel.JSON_MODE = 2;
DataTableModel.XML_MODE = 3;

export default DataTableModel;
