import * as d3 from '../../lib/d3.min.js';
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

    // Inject the svg
    d3el.select('#graphicsContent').html(this.model.xmlText);

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
    this.zoom(d3el, 100);

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
  }
  draw (d3el) {
    d3el.selectAll('.notUnderSelectedRoot')
      .classed('notUnderSelectedRoot', false);

    let graphicsContent = d3el.select('#graphicsContent');
    function deemphasizeSiblings (element) {
      if (element === graphicsContent.node()) {
        return;
      }
      Array.from(element.parentElement.children).forEach(sibling => {
        if (sibling !== element) {
          d3.select(sibling).classed('notUnderSelectedRoot', true);
        }
      });
      deemphasizeSiblings(element.parentElement);
    }
    let selectedRoot = d3el.select('#graphicsContent')
      .select(this.model.rootSelector).node();
    deemphasizeSiblings(selectedRoot);
    this.updateVisibleLocations(d3el);
  }
  zoom (d3el, percent) {
    d3el.select('#zoomPercent').property('value', percent + '%');
    let factor = percent / 100;
    let svgEl = d3el.select('svg');
    svgEl.attr('width', factor * this.nativeWidth)
      .attr('height', factor * this.nativeHeight);
    this.updateVisibleLocations(d3el);
  }
  updateVisibleLocations (d3el) {
    // TODO
  }
}

export default GraphicsDirectView;
