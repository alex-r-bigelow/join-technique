import jQuery from 'jquery';
import Underscore from 'underscore';

import Handsontable from '../../node_modules/handsontable/dist/handsontable.full.js';
import '../../node_modules/handsontable/dist/handsontable.full.css';
import JoinableView from '../JoinableView';
import JoinInterfaceView from '../JoinInterfaceView';

import template from './template.html';
import tableIcon from '../../img/table.svg';
import './style.scss';

class DataTableView extends JoinableView {
  constructor () {
    super();
    this.icon = tableIcon;
    this.lastCurrentRows = null;
  }
  setup (d3el) {
    d3el.html(template);
    if (!this.model) {
      // The way things are initialized, it's possible to call
      // setup before we have a model; this is a sneaky way to
      // make sure setup is called again once a model is ready
      window.setTimeout(() => { this.dirty = true; this.render(d3el); }, 200);
      return;
    }

    this.handsontable = new Handsontable(d3el.select('#table').node(), {
      data: this.model.rows,
      colHeaders: this.model.parsedHeaders,
      rowHeaders: index => {
        // When a sort is applied (or a later subset of the data is loaded),
        // we want to display the native row number
        if (this.handsontable) {
          let plugin = this.handsontable.getPlugin('ColumnSorting');
          let physicalRow = plugin.translateRow(index);
          if (physicalRow !== undefined) {
            // A sort has likely been applied... update the index
            // to be the index of the in-memory array
            index = physicalRow;
          }
        }
        // Convert the in-memory array index to the native index in the dataset
        return this.model.getNativeIndex(index);
      },
      manualColumnResize: true,
      manualRowResize: true,
      // contextMenu: true,
      columnSorting: true,
      sortIndicator: true
    });
    this.handsontable.addHook('afterColumnSort', () => { this.render(); });

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
      this.updateVisibleLocations(d3el);
      this.joinInterfaceView.render();
      this.initialScrollTop = undefined;
    }, 200), { passive: true });

    // Finally, listen to the rows for updates, so that we
    // re-render ourselves when necessary
    this.model.on('update', () => { this.render(d3el); });

    // A flag to force an update of the visible positions
    this.firstRender = true;
  }
  draw (d3el) {
    let currentRows = this.model ? this.model.rows : null;
    if (currentRows !== this.lastCurrentRows) {
      // TODO: this change is pretty jarring... even though the data is
      // different, we should try to maintain as much state that the table has
      // that we can (sort settings, scrolled location...)
      this.handsontable.loadData(currentRows);
      this.handsontable.render();
      this.lastCurrentRows = currentRows;
    }

    // Have to manually let the table know if our viewport has been resized
    // (doesn't trigger a full render(), though)
    let tableEl = this.d3el.select('#table');
    // temporarily remove the hard-coded with attribute so that the default CSS
    // styles can tell us how much space we have
    tableEl.style('width', null);
    let newSize = tableEl.node().getBoundingClientRect();
    this.handsontable.updateSettings({
      width: newSize.width,
      height: newSize.height
    });

    // Update the message at the bottom (TODO: use icon indicators, integrated
    // with the rest of the icons)
    // let status = this.model ? this.model.rows.status : Incremental.UNINITIALIZED;
    // let message = 'Loading...';
    // if (status === Incremental.FINISHED) {
    //   message = 'Loaded successfully';
    // } else if (status === Incremental.ERROR) {
    //   message = 'Error: ' + this.model.rows.error.message;
    // }
    // d3el.select('#message')
    //   .text(message)
    //   .classed('error', status === Incremental.ERROR);

    this.updateVisibleLocations(d3el);
  }
  updateVisibleLocations (d3el) {
    let side = this.joinInterfaceView.getSide(this);
    let tableBBox = d3el.select('.ht_master .wtHolder').node().getBoundingClientRect();
    let headerBBox = d3el.select('.ht_clone_top .htCore thead').node().getBoundingClientRect();
    let rowElements = d3el.selectAll('.ht_master .htCore tbody tr');

    let xPosition;
    if (rowElements.size() > 0) {
      // Determine the best x-coordinate
      let firstRowBBox = rowElements.node().getBoundingClientRect();

      if (side === JoinInterfaceView.LEFT) {
        // Ideally, we'd like the dot to be just to the right of the row
        if (firstRowBBox.right < tableBBox.right - 2 * this.emSize) {
          // There's enough space between the right boundary of the table
          // and the scroll bar; in this situation, we'd like the dot just to the
          // right of the row (inside the scroll bar)
          xPosition = firstRowBBox.right + this.emSize;
        } else {
          // Not enough space before we hit the scroll bar; put the dot
          // outside of the scroll bar
          xPosition = tableBBox.right + this.emSize;
        }
      } else {
        // the left edge is much simpler
        xPosition = tableBBox.left - this.emSize;
      }
    }

    // Store the old locations so we can tell if anything changed
    let oldLocations = this.visibleLocations;

    // Figure out our new set of visible locations
    this.visibleLocations = {};
    this.globalIndices = [];
    let self = this;
    rowElements.each(function () {
      // this refers to the DOM element
      let index = parseInt(jQuery(this).find('.rowHeader').text());
      let rowBBox = this.getBoundingClientRect();
      if (!isNaN(index)) {
        let location = {
          x: xPosition,
          y: rowBBox.top + rowBBox.height / 2
        };
        // Rows that have their center point obscured by the scroll bar
        // should start disappearing
        location.transitioning = location.y > tableBBox.bottom - self.scrollBarSize;
        // Rows that have their center point above the bottom of the header
        // should start disappearing
        location.transitioning = location.transitioning || location.y < headerBBox.bottom;
        self.visibleLocations[index] = location;
        if (!location.transitioning) {
          self.globalIndices.push(index);
        }
        // Assess whether anything has actually changed; if it has,
        // we may need to issue a render call
        if (index in oldLocations &&
          oldLocations[index].x === location.x &&
          oldLocations[index].y === location.y &&
          oldLocations[index].transitioning === location.transitioning) {
          delete oldLocations[index];
        }
      }
    });

    // If something changed, signal our parent view that the indices have changed
    if (this.firstRender || Object.keys(oldLocations).length > 0) {
      this.joinInterfaceView.updateVisibleItems();
      this.firstRender = false;
    }
  }
}

export default DataTableView;
