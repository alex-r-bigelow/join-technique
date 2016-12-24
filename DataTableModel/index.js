import JoinableModel from '../JoinableModel';

class DataTableModel extends JoinableModel {
  constructor () {
    super();

    // This is an abstract class; we require that these methods be implemented:
    let requiredMethods = ['nextChunk', 'numChunks'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError('Must override ' + m + ' method');
      }
    });

    this.parsedRecords = null;
    this.parsedHeaders = null;
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
    // column headers. Otherwise, this should be a user-supplied array of predefined column names.

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
  numItems () {
    if (this.parsedRecords !== null) {
      return 0;
    } else {
      return this.parsedRecords.length;
    }
  }
  allProperties () {
    if (this.parsedHeaders === null) {
      return [];
    } else {
      return this.parsedHeaders;
    }
  }
  get parsedPercentage () {
    if (this.parseProgress === null) {
      return null;
    } else {
      return 100 * this.parseProgress / this.numChunks();
    }
  }
  parse () {
    return new Promise((resolve, reject) => {
      if (this.parsedRecords !== null) {
        resolve(this.parsedRecords);
      } else {
        this._parse(resolve, errorMessage => {
          // parsing failed for some reason; interrupt further parsing
          // before we pass along the error message
          this.interrupt();
          reject(errorMessage);
        });
      }
    });
  }
  interrupt () {
    this.parsedRecords = null;
    this.parsedHeaders = null;
    this._parseProgress = null;
  }
  _parse (successCallback, failureCallback) {
    this.parsedRecords = [];
    let state;
    for (this.parseProgress = 0; this.parseProgress < this.numChunks(); this.parseProgress += 1) {
      if (this.parsedRecords === null) {
        // Something interrupted the process; we should stop parsing
        // (no need to send an additional "interrupted" failure message - there will
        // either be another error message that caused this interruption, or the
        // process trying to get at the parsed content will have deliberately
        // interrupted this itself)
        return;
      }
      let chunk = this.nextChunk();
      // try {
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
      // } catch (e) {
      //   failureCallback(e.message);
      // }
    }
    successCallback(this.parsedRecords);
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
        // check if this is the last chunk and return the finished value. Otherwise,
        // return the full state object so that we can pick up where we left off
        if (this.parseProgress + 1 >= this.numChunks()) {
          state.finished = true;
        }
        return state;
      }
      let charHandled = false;
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
          charHandled = true;
        } else if (chunk[index] === this.dsvSettings.escapeChar) {
          state.escapeNextChar = true;
          charHandled = true;
        }
      }
      if (!charHandled) {
        state.escapeNextChar = false;
        state.value += chunk[index];
      }
      index += 1;
    }
  }
  parseDsvChunk (chunk, oldState) {
    let index = 0;
    if (this.parsedHeaders === null && this.dsvSettings.columnHeaders instanceof Array) {
      this.parsedHeaders = this.dsvSettings.columnHeaders;
    } else if (typeof this.dsvSettings.columnHeaders !== 'number') {
      throw new Error('columnHeaders setting must be an array or an integer');
    }
    let state = oldState || {
      values: [],
      finished: false,
      row: 0
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
      let current = this.nextDsvValue(state.index, chunk, oldValue);
      oldValue = null;
      state.values.push(current);
      state.index += current.value.length;
      let definedHeaders = this.parsedHeaders !== null;
      let numHeaders = definedHeaders ? this.parsedHeaders.length : null;
      let endOfChunk = state.index >= chunk.length;
      let newline = false;

      if (!endOfChunk) {
        // Move forward a character to skip the delimiter or newline
        newline = this.dsvSettings.lineBreakChars.indexOf(chunk[state.index]) !== -1;
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
        // update endOfChunk
        endOfChunk = state.index >= chunk.length;
      }

      if (newline || (endOfChunk && current.finished)) {
        // That was a newline or the end of the document;
        // this row is finished
        if (state.row === 0) {
          // finished the first line, so we know how many headers we have
          numHeaders = state.values.length;
        }
        state.row += 1;
        if (!definedHeaders) {
          if (state.row >= this.dsvSettings.columnHeaders) {
            // we've finished extracting all the headers
            // if there was more than one row, we'll need to stitch each chunk together
            let temp = [];
            state.values.forEach((h, i) => {
              i = i % numHeaders;
              if (i >= temp.length) {
                temp.push('');
              }
              if (temp[i].length > 0) {
                temp[i] += '\n';
              }
              temp[i] += h.value;
            });
            this.parsedHeaders = temp;
            state.values = [];
          }
          // If we're *not* done extracting all the headers,
          // we want to continue to collect all the headers from the next row
          // (the logic above handles the fact that state.values gets longer
          // than state.numHeaders)
        } else {
          // It was a regular data row
          let newRecord = [];
          // TODO: does it make more sense to add dicts instead of arrays with
          // potentially empty strings? AFAIK, handsontable behaves better
          // when they're arrays...
          this.parsedHeaders.forEach((h, i) => {
            newRecord.push(state.values[i].value);
          });
          this.parsedRecords.push(newRecord);
          state.values = [];
        }
      }
      if (endOfChunk) {
        // we've parsed the whole chunk; time to send it back
        state.finished = current.finished;
        return state;
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
