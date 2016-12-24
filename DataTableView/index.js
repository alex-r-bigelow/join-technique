import Handsontable from '../node_modules/handsontable/dist/handsontable.full.js';
import '../node_modules/handsontable/dist/handsontable.full.css';
import JoinableView from '../JoinableView';

import template from './template.html';
import tableIcon from '../img/table.svg';
import './style.scss';

class DataTableView extends JoinableView {
  constructor () {
    super();
    this.icon = tableIcon;
  }
  render (d3el) {
    if (this.model === null) {
      this._render(d3el, 'No data loaded');
      return;
    }
    if (this.model.parsedPercentage === null) {
      this.model.parse().then(parsedResult => {
        this._render(d3el, 'Loaded successfully');
      }).catch(errorMessage => {
        if (errorMessage instanceof Error) {
          console.warn('Error in parse(): ' + errorMessage.message);
          console.warn(errorMessage.stack);
          errorMessage = errorMessage.message;
        }
        this._render(d3el, errorMessage);
      });
    }
    this._render(d3el);
  }
  _render (d3el, message) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
      this.handsontable = new Handsontable(this.d3el.select('#table').node(), {
        data: this.model ? this.model.parsedRecords : [],
        colHeaders: this.model ? this.model.parsedHeaders : [],
        rowHeaders: index => {
          // When a sort is applied, we want to list the native physical row
          if (!this.handsontable) {
            return index;
          } else {
            let plugin = this.handsontable.getPlugin('ColumnSorting');
            let physicalRow = plugin.untranslateRow(index);
            if (physicalRow === undefined) {
              return index;
            } else {
              return physicalRow;
            }
          }
        },
        manualColumnResize: true,
        manualRowResize: true,
        contextMenu: true,
        columnSorting: true,
        sortIndicator: true
      });
    }

    let newSize = this.d3el.select('#table').node().getBoundingClientRect();
    this.handsontable.updateSettings({
      width: newSize.width,
      height: newSize.height
    });

    let isErrorMessage = message && message !== 'Loaded successfully';
    if (!message) {
      if (this.model.parsedPercentage === 100) {
        message = 'Loaded successfully';
      } else {
        message = this.model.parsedPercentage + '% loaded';
      }
    }
    this.d3el.select('#message')
      .text(message)
      .classed('error', isErrorMessage);
    this.handsontable.render();
  }
}

export default DataTableView;
