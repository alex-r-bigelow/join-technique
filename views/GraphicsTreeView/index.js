import * as d3 from '../../lib/d3.min.js';
import JoinableView from '../JoinableView';

import template from './template.html';
import treeIcon from '../../img/tree.svg';
import './style.scss';

class GraphicsTreeView extends JoinableView {
  constructor () {
    super();
    this.icon = treeIcon;
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
  }
  draw (d3el) {
    function drawTreeLevel (targetD3element, sourceParentElement, depth) {
      let children = Array.from(sourceParentElement.children);
      if (children.length === 0) {
        return;
      }
      let details = targetD3element.selectAll('details').data(children);
      details.exit().remove();
      let detailsEnter = details.enter().append('details');
      let summaryEnter = detailsEnter.append('summary');
      summaryEnter.append('div').classed('tagName', true);
      summaryEnter.append('div').classed('rootSelector', true);
      detailsEnter.append('ul');
      details = detailsEnter.merge(details);

      // details.style('left', -depth + 'em');

      details.select('summary')
        .style('left', depth + 'em')
        .style('width', 'calc(100% - ' + depth + 'em)')
        .select('.tagName')
        .text(d => d.tagName);

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

    this.updateVisibleLocations(d3el);
  }
  updateVisibleLocations (d3el) {
    // TODO
  }
}

export default GraphicsTreeView;
