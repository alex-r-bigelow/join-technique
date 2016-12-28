import jQuery from 'jquery';
import Underscore from 'underscore';

import Handsontable from '../node_modules/handsontable/dist/handsontable.full.js';
import '../node_modules/handsontable/dist/handsontable.full.css';
import JoinableView from '../JoinableView';
import JoinInterfaceView from '../JoinInterfaceView';

import template from './template.html';
import tableIcon from '../img/table.svg';
import './style.scss';

class DataTableView extends JoinableView {
  constructor () {
    super();
    this.icon = tableIcon;

    this.visibleLocations = {};
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
            let physicalRow = plugin.translateRow(index);
            if (physicalRow === undefined) {
              return index;
            } else {
              return physicalRow;
            }
          }
        },
        manualColumnResize: true,
        manualRowResize: true,
        // contextMenu: true,
        columnSorting: true,
        sortIndicator: true
      });

      // TODO: remove this debugging line
      window.temphandsontable = this.handsontable;

      this.handsontable.render();
      let scrollContainer = this.d3el.select('.ht_master .wtHolder').node();
      scrollContainer.addEventListener('scroll', () => {
        // Shallow scroll motion effect that needs to happen with the interaction
        if (this.initialScrollTop === undefined) {
          this.initialScrollTop = scrollContainer.scrollTop;
        }
        this.joinInterfaceView.scrollView(this, {
          dx: 0,
          dy: this.initialScrollTop - scrollContainer.scrollTop
        });
      }, { passive: true });
      scrollContainer.addEventListener('scroll', Underscore.debounce(() => {
        // Once points have been moved, add / remove / update them
        this.updateVisibleLocations();
        this.joinInterfaceView.render();
        this.initialScrollTop = undefined;
      }, 200), { passive: true });
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

    this.updateVisibleLocations();
  }
  updateVisibleLocations () {
    let side = this.joinInterfaceView.getSide(this);
    let tableBBox = this.d3el.select('.ht_master .wtHolder').node().getBoundingClientRect();
    let xPosition = side === JoinInterfaceView.LEFT ? tableBBox.right : tableBBox.left;
    let rowElements = this.d3el.selectAll('.ht_master .htCore tbody tr');
    let oldLocations = this.visibleLocations;
    this.visibleLocations = {};
    let self = this;
    rowElements.each(function () {
      // this refers to the DOM element
      let index = parseInt(jQuery(this).find('.rowHeader').text());
      let rowBBox = this.getBoundingClientRect();
      if (!isNaN(index)) {
        self.visibleLocations[index] = {
          x: xPosition,
          y: rowBBox.top + rowBBox.height / 2,
          transitioning: rowBBox.top < tableBBox.top || rowBBox.bottom > tableBBox.bottom
        };
        // Assess whether anything has actually changed; if it has,
        // we may need to issue a render call
        if (index in oldLocations &&
          oldLocations[index].x === self.visibleLocations[index].x &&
          oldLocations[index].y === self.visibleLocations[index].y &&
          oldLocations[index].transitioning === self.visibleLocations[index].transitioning) {
          delete oldLocations[index];
        }
      }
    });
    if (Object.keys(oldLocations).length > 0) {
      this.joinInterfaceView.render();
    }
  }
}

export default DataTableView;
