import * as d3 from 'd3';
import Underscore from 'underscore';

import JoinableView from '../JoinableView';

import template from './template.html';
import graphicsIcon from '../../img/graphics.svg';
import './style.scss';

class GraphicsDirectView extends JoinableView {
  constructor () {
    super();
    this.icon = graphicsIcon;
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

    // Inject the svg, with an extra group on top for selection targets
    let graphicsContent = d3el.select('#graphicsContent');
    graphicsContent.html(this.model.xmlText)
      .select('svg').append('g').attr('id', 'selectionOverlay');

    let self = this;
    graphicsContent.on('scroll', function () {
      // Shallow scroll motion effect that needs to happen with the interaction
      if (self.initialScrollTop === undefined) {
        self.initialScrollTop = this.scrollTop;
        self.initialScrollLeft = this.scrollLeft;
      }
      self.joinInterfaceView.scrollView(this, {
        dx: self.initialScrollLeft - this.scrollLeft,
        dy: self.initialScrollTop - this.scrollTop
      });
    }, { passive: true });
    graphicsContent.on('scroll', Underscore.debounce(() => {
      // Once points have been moved, add / remove / update them
      self.updateVisibleLocations(d3el);
      self.joinInterfaceView.render();
      self.initialScrollTop = undefined;
      self.initialScrollLeft = undefined;
    }, 200), { passive: true });

    // Finally, listen to the rows for updates, so that we
    // re-render ourselves when necessary
    this.model.on('update', () => { this.render(d3el); });

    // Figure out the native SVG size in pixels... because width and height
    // attributes can be specified in units other than px (and we want to
    // make the browser handle unit conversion), we'll defer to the viewBox
    // parameters only if the viewBox attribute exists, and the width and height
    // don't (in that case, the SVG auto-scales to its container, which we don't
    // want). Otherwise, we'll use the results of getBoundingClientRect()
    let svgEl = d3el.select('svg');
    if (svgEl.attr('viewBox') && !svgEl.attr('width') && !svgEl.attr('height')) {
      let viewBox = svgEl.attr('viewBox').split(' ');
      this.nativeWidth = parseInt(viewBox[2]);
      this.nativeHeight = parseInt(viewBox[3]);
    } else {
      let bounds = svgEl.node().getBoundingClientRect();
      this.nativeWidth = bounds.width;
      this.nativeHeight = bounds.height;
    }

    let percentField = d3el.select('#zoomPercent');
    percentField.on('change', () => {
      let percent = parseFloat(percentField.property('value'));
      if (!percent || isNaN(percent)) {
        percent = 100;
      }
      this.zoom(d3el, percent);
    });
    d3el.select('#zoomInButton').on('click', () => {
      let percent = parseFloat(percentField.property('value')) * 2;
      percent = Math.min(percent, 1600);
      this.zoom(d3el, percent);
    });
    d3el.select('#zoomOutButton').on('click', () => {
      let percent = parseFloat(percentField.property('value')) / 2;
      percent = Math.max(percent, 12.5);
      this.zoom(d3el, percent);
    });

    this.firstDraw = true;

    this.zoom(d3el, 100);
  }
  draw (d3el) {
    d3el.selectAll('.notJoinable')
      .classed('notJoinable', false);

    // Grey out all the elements that aren't under the current root
    let graphicsContent = d3el.select('#graphicsContent');
    function deemphasizeSiblings (element) {
      if (element === graphicsContent.node()) {
        return;
      }
      Array.from(element.parentElement.children).forEach(sibling => {
        if (sibling !== element && sibling.getAttribute('id') !== 'selectionOverlay') {
          d3.select(sibling).classed('notJoinable', true);
        }
      });
      deemphasizeSiblings(element.parentElement);
    }
    let selectedRoot = d3el.select('#graphicsContent')
      .select(this.model.rootSelector).node();
    deemphasizeSiblings(selectedRoot);

    // Update the selection overlay, making interaction targets for
    // the current root's immediate children
    let selectionOverlay = d3el.select('#selectionOverlay');
    let selectionTargets = selectionOverlay.selectAll('.selectionTarget')
      .data(this.getJoinableElements(d3el), d => d.selector);
    selectionTargets.exit().remove();
    selectionTargets = selectionTargets.enter().append('rect')
      .classed('selectionTarget', true)
      .merge(selectionTargets);
    selectionTargets
      .attr('x', d => d.localBounds.left + 'px')
      .attr('y', d => d.localBounds.top + 'px')
      .attr('width', d => d.localBounds.width + 'px')
      .attr('height', d => d.localBounds.height + 'px')
      .on('click', d => {
        this.model.setCurrentRoot(d.element);
        this.render();
      });

    this.updateVisibleLocations(d3el);
  }
  getJoinableElements (d3el) {
    let graphicsContentNode = d3el.select('#graphicsContent').node();
    let containerBounds = graphicsContentNode.getBoundingClientRect();
    let zoomFactor = parseFloat(d3el.select('#zoomPercent').property('value')) / 100;
    return this.model.getCurrentChildren().map(d => {
      // this is a little tricky; d refers to the DOM node in the model
      // (that isn't in the page)... so to get the bounds, we need to select
      // the DOM element in the view, not the model
      let selector = this.model.getSelector(d);
      let globalBounds = d3el.select('#graphicsContent')
        .select(selector).node().getBoundingClientRect();
      let localBounds = {
        left: (globalBounds.left + graphicsContentNode.scrollLeft - containerBounds.left) / zoomFactor,
        top: (globalBounds.top + graphicsContentNode.scrollTop - containerBounds.top) / zoomFactor,
        width: globalBounds.width / zoomFactor,
        height: globalBounds.height / zoomFactor
      };
      return {
        element: d,
        selector: selector,
        globalBounds,
        localBounds
      };
    });
  }
  zoom (d3el, percent) {
    d3el.select('#zoomPercent').property('value', percent + '%');
    let factor = percent / 100;
    let svgEl = d3el.select('svg');
    svgEl.attr('width', factor * this.nativeWidth)
      .attr('height', factor * this.nativeHeight);
    this.render();
  }
  updateVisibleLocations (d3el) {
    let containerBBox = d3el.select('#graphicsContent').node().getBoundingClientRect();
    let joinableElements = this.getJoinableElements(d3el);

    // Store the old locations so we can tell if anything changed
    let oldLocations = this.visibleLocations;

    // Figure out our new set of visible locations
    this.visibleLocations = {};
    this.globalIndices = [];
    let self = this;
    joinableElements.forEach((d, i) => {
      // this refers to the DOM element
      let leftBound = Math.max(d.globalBounds.left, containerBBox.left);
      let rightBound = Math.min(d.globalBounds.right, containerBBox.right);
      let topBound = Math.max(d.globalBounds.top, containerBBox.top);
      let bottomBound = Math.min(d.globalBounds.bottom, containerBBox.bottom);

      let location = {
        x: (leftBound + rightBound) / 2,
        y: (topBound + bottomBound) / 2
      };
      location.transitioning = leftBound >= rightBound - this.emSize ||
        topBound >= bottomBound - this.emSize;

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
    if (this.firstDraw || Object.keys(oldLocations).length > 0) {
      this.joinInterfaceView.updateVisibleItems();
      this.firstDraw = false;
    }
  }
}

export default GraphicsDirectView;
