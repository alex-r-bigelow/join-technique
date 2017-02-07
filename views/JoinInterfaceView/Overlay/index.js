import * as d3 from '../../../lib/d3.min.js';

import View from '../../../lib/View';
import JoinInterfaceView from '..';
import template from './template.svg';

class Overlay extends View {
  constructor (joinInterfaceView) {
    super();

    this.joinInterfaceView = joinInterfaceView;
  }
  setup (d3el) {
    d3el.html(template);
  }
  drawPoints (d3el, side, items, commonTransition) {
    let newItems = items.filter(d => !d.location.transitioning);
    let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';

    // First, the data binding...
    let points = d3el.select(containerSelector)
      .selectAll('g.point')
      .data(newItems, d => d.globalIndex);

    // Get rid of any leaving points before we do anything so they don't flash into view
    points.exit().remove();

    // Next, clear off any scrolling that just happened to this container
    d3el.select(containerSelector).attr('transform', null);

    // Create any new points
    let pointsEnter = points.enter()
      .append('g')
      .classed('point', true)
      .style('opacity', 0);
    pointsEnter.append('circle')
      .attr('r', 5);

    // Move all points where they need to be / animate everything
    points = pointsEnter.merge(points);
    points.attr('transform', d => 'translate(' + d.location.x + ',' + d.location.y + ')')
      .transition(commonTransition)
      .style('opacity', 1);
  }
  drawLines (d3el, items, commonTransition) {
    // Draw the preset connections
    let connections = Object.keys(this.joinInterfaceView.joinModel.visiblePresetConnections).filter(key => {
      return !this.joinInterfaceView.joinModel.customRemovals[key];
    });
    connections = connections.concat(Object.keys(this.joinInterfaceView.joinModel.customConnections));

    let lines = d3el.select('#lines').selectAll('.connection')
      .data(connections);

    lines.exit()
      .transition(commonTransition)
      .style('opacity', 0)
      .remove();

    let linesEnter = lines.enter().append('g')
      .classed('connection', true)
      .style('opacity', 0);

    linesEnter.append('path');

    lines = linesEnter.merge(lines);
    lines.transition(commonTransition)
      .style('opacity', 1);

    lines.selectAll('path').attr('d', d => {
      let [leftKey, rightKey] = d.split('_');
      if (items[JoinInterfaceView.LEFT][leftKey]) {
        if (items[JoinInterfaceView.RIGHT][rightKey]) {
          // Connect both ends
          return 'M' + items[JoinInterfaceView.LEFT][leftKey].location.x + ',' +
                       items[JoinInterfaceView.LEFT][leftKey].location.y +
                 'L' + items[JoinInterfaceView.RIGHT][rightKey].location.x + ',' +
                       items[JoinInterfaceView.RIGHT][rightKey].location.y;
        } else {
          // Just connect the left end
          return 'M' + items[JoinInterfaceView.LEFT][leftKey].location.x + ',' +
                       items[JoinInterfaceView.LEFT][leftKey].location.y +
                 'L' + (items[JoinInterfaceView.LEFT][leftKey].location.x + 2 * this.emSize) + ',' +
                       items[JoinInterfaceView.LEFT][leftKey].location.y;
        }
      } else {
        // Just connect the right end
        return 'M' + items[JoinInterfaceView.RIGHT][rightKey].location.x + ',' +
                     items[JoinInterfaceView.RIGHT][rightKey].location.y +
               'L' + (items[JoinInterfaceView.RIGHT][rightKey].location.x - 2 * this.emSize) + ',' +
                     items[JoinInterfaceView.RIGHT][rightKey].location.y;
      }
    });
  }
  draw (d3el) {
    // Common transition object to coordiante all the animation
    let t = d3.transition()
      .duration(1000);

    // Draw the dots on either side
    let allItems = {};
    [JoinInterfaceView.LEFT, JoinInterfaceView.RIGHT].forEach(side => {
      allItems[side] = this.joinInterfaceView.getVisibleItemDetails(side);
      this.drawPoints(d3el, side, allItems[side], t);
    });

    // Draw the lines
    this.drawLines(d3el, allItems, t);
  }
  scrollView (side, vector) {
    // Cheaply just translate the scrolled group instead of redrawing the points; this will be removed
    // when the view is re-rendered
    let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';
    this.d3el.select(containerSelector).attr('transform', 'translate(' + vector.dx + ',' + vector.dy + ')');
  }
}

export default Overlay;
