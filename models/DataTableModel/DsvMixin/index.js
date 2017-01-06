function DsvMixin (superclass) {
  return class extends superclass {
    constructor () {
      super(...arguments);

      this.settings = {
        delimiters: [','],
        quoteChar: '"',
        escapeChar: '\\',
        lineBreakChars: ['\n'],
        mergeConsecutiveDelimiters: false,
        columnHeaders: 1
      };
      // When columnHeaders is an integer, it means that the first n lines are used as the
      // column headers. Otherwise, this should be a user-supplied array of predefined column names.

      this.parsedHeaders = null;
    }
    parseChunk (chunk, oldState) {
      let index = 0;
      if (this.parsedHeaders === null && this.settings.columnHeaders instanceof Array) {
        this.parsedHeaders = this.settings.columnHeaders;
      } else if (typeof this.settings.columnHeaders !== 'number') {
        throw new Error('columnHeaders setting must be an array or an integer');
      }
      let state = oldState || {
        values: [],
        finished: false,
        row: 0
      };
      state.index = index;
      state.parsedRecords = [];
      // Starting a new chunk, so even oldState should start at index (in that case,
      // index will be zero). Also, we always start with a clean slate as far as
      // the records that we already parsed; we leave it to the mixed-in class
      // to figure out memory management & how much to load at a time

      // check if we have a split value that we're starting with...
      let oldValue = null;
      if (state.values.length > 0 && state.values[state.values.length - 1].finished === false) {
        oldValue = state.values.pop();
      }
      while (true) {
        let current = this.nextValue(state.index, chunk, oldValue);
        oldValue = null;
        state.values.push(current);
        state.index += current.value.length;
        let definedHeaders = this.parsedHeaders !== null;
        let numHeaders = definedHeaders ? this.parsedHeaders.length : null;
        let endOfChunk = state.index >= chunk.length;
        let newline = false;

        if (!endOfChunk) {
          // Move forward a character to skip the delimiter or newline
          newline = this.settings.lineBreakChars.indexOf(chunk[state.index]) !== -1;
          state.index += 1;
          while (this.settings.mergeConsecutiveDelimiters) {
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
            if (state.row >= this.settings.columnHeaders) {
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
              newRecord.push(state.values[i] ? state.values[i].value : '');
            });
            state.parsedRecords.push(newRecord);
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
    nextValue (index, chunk, oldState) {
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
            if (this.settings.delimiters.indexOf(chunk[index]) !== -1 ||
                this.settings.lineBreakChars.indexOf(chunk[index]) !== -1) {
              // Finished a value
              state.finished = true;
              return state;
            }
          } else if (chunk[index] === this.settings.quoteChar) {
            state.quoted = !state.quoted;
            charHandled = true;
          } else if (chunk[index] === this.settings.escapeChar) {
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
  };
}

export default DsvMixin;
