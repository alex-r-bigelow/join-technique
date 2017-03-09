import * as d3 from 'd3';
import Underscore from 'underscore';

import JoinableView from '../JoinableView';
import JoinInterfaceView from '../JoinInterfaceView';

import template from './template.html';
import treeIcon from '../../img/tree.svg';
import './style.scss';

class GraphicsTreeView extends JoinableView {
  constructor () {
    super();
    this.icon = treeIcon;

    this.expandedState = {};
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

    let scrollContainer = d3el.select('#graphicsTree').node();
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

    this.firstDraw = true;
  }
  draw (d3el) {
    let self = this;
    function drawTreeLevel (targetD3element, sourceParentElement, depth) {
      let children = Array.from(sourceParentElement.children);
      if (children.length === 0) {
        // Base case; don't continue the tree if there aren't any child elements
        return;
      }

      // Create details and summary objects for collapsing / expanding
      let details = targetD3element.selectAll('.level' + depth)
        .data(children, d => self.model.getSelector(d));
      details.exit().remove();
      let detailsEnter = details.enter().append('details')
        .classed('level' + depth, true);
      let summaryEnter = detailsEnter.append('summary');
      summaryEnter.append('div').classed('tagName', true);
      summaryEnter.append('div').classed('rootSelector', true);
      // We will also want a list of the DOM attributes if there are any
      detailsEnter.append('ul');
      details = detailsEnter.merge(details);

      // Flag the details object if this is the current root
      details.classed('selected', d => d === self.model.getCurrentRoot());

      // If the current root is the parent of this item, it's eligible for
      // joining to the dataset
      let isJoinable = sourceParentElement === self.model.getCurrentRoot();
      details.classed('isJoinable', isJoinable);

      // Whenever the user collapses / expands a details element, save the state
      // in the event we need to do a fresh render
      details.on('toggle', function (d) {
        // this refers to the DOM element
        let selector = self.model.getSelector(d);
        if (d3.select(this).property('open')) {
          self.expandedState[selector] = true;
        } else {
          delete self.expandedState[selector];
        }
        self.render();
      });
      if (self.firstDraw) {
        details.property('open', function (d) {
          // this refers to the DOM element
          return self.expandedState[self.model.getSelector(d)];
        });
      }

      // Add and scale the summary row (tag name + root selector)
      let summary = details.select('summary')
        .style('padding-left', (depth + 0.25) + 'em');
      summary.select('.tagName')
        .text(d => d.tagName)
        .style('left', (depth + 1.25) + 'em');
      summary.select('.rootSelector')
        .on('click', d => {
          self.model.setCurrentRoot(d);
          d3.event.preventDefault();
          self.render();
        });

      // If there are any attributes of the element, list them as a table
      let attributes = details.select('ul').selectAll('li')
        .data(d => Array.from(d.attributes));
      attributes.exit().remove();
      let attributesEnter = attributes.enter().append('li');
      attributesEnter.append('div').classed('attributeName', true);
      attributesEnter.append('div').classed('attributeValue', true);
      attributes = attributesEnter.merge(attributes);

      attributes.select('.attributeName').text(d => d.name);
      attributes.select('.attributeValue').text(d => d.value);

      // recursively append the next level below each child
      details.each(function (d) {
        // this refers to the DOM element
        drawTreeLevel(d3.select(this), d, depth + 1);
      });
    }
    drawTreeLevel(d3el.select('#graphicsTree'), this.model.doc, 0);
    this.firstDraw = false;

    this.updateVisibleLocations(d3el);
  }
  updateVisibleLocations (d3el) {
    let side = this.joinInterfaceView.getSide(this);
    let containerBBox = d3el.select('#graphicsTree').node().getBoundingClientRect();
    let joinableElements = d3el.selectAll('.isJoinable').select('summary');

    // put the dots to the left or the right of the tree
    let xPosition = side === JoinInterfaceView.RIGHT
      ? containerBBox.left - this.emSize : containerBBox.right + this.emSize;

    // Store the old locations so we can tell if anything changed
    let oldLocations = this.visibleLocations;

    // Figure out our new set of visible locations
    this.visibleLocations = {};
    this.globalIndices = [];
    let self = this;
    joinableElements.each(function (d, i) {
      // this refers to the DOM element
      let rowBBox = this.getBoundingClientRect();
      let location = {
        x: xPosition,
        y: rowBBox.top + rowBBox.height / 2
      };
      // Rows that have their center point obscured by the bottom edge
      // should start disappearing
      location.transitioning = location.y > containerBBox.bottom;
      // Rows that have their center point above the top edge
      // should start disappearing
      location.transitioning = location.transitioning || location.y < containerBBox.top;
      self.visibleLocations[i] = location;
      if (!location.transitioning) {
        self.globalIndices.push(i);
      }
      // Assess whether anything has actually changed; if it has,
      // we may need to issue a render call
      if (i in oldLocations &&
        oldLocations[i].x === location.x &&
        oldLocations[i].y === location.y &&
        oldLocations[i].transitioning === location.transitioning) {
        delete oldLocations[i];
      }
    });

    // If something changed, signal our parent view that the indices have changed
    if (this.firstRender || Object.keys(oldLocations).length > 0) {
      this.joinInterfaceView.updateVisibleItems();
      this.firstRender = false;
    }
  }
}

export default GraphicsTreeView;
