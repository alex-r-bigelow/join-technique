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
      .attr('r', 0.65 * this.emSize);
    pointsEnter.append('text')
      .attr('y', 0.35 * this.emSize);

    // Move all points where they need to be / animate everything
    points = pointsEnter.merge(points);
    points.attr('transform', d => 'translate(' + d.location.x + ',' + d.location.y + ')')
      .classed('stillCounting', d => !d.details || d.details.stillCounting)
      .transition(commonTransition)
      .style('opacity', 1);
    points.select('text')
      .text(d => d.details ? d.details.totalConnections : 0);
  }
  drawLines (d3el, leftItems, rightItems, commonTransition) {
    let joinModel = this.joinInterfaceView.joinModel;

    // Get a list of the visible preset connections + the customizations
    let connections = Object.keys(joinModel.visiblePresetConnections).filter(key => {
      return !joinModel.customRemovals[key];
    });
    connections = connections.concat(Object.keys(joinModel.customConnections));

    // Get rid of lines that should be leaving
    connections = connections.filter(d => {
      let [leftGlobalIndex, rightGlobalIndex] = d.split('_');
      let leftLocalIndex = joinModel.leftLookup[leftGlobalIndex].localIndex;
      let rightLocalIndex = joinModel.rightLookup[rightGlobalIndex].localIndex;
      return !leftItems[leftLocalIndex].location.transitioning &&
             !rightItems[rightLocalIndex].location.transitioning;
    });

    // Add at most one line for items that have no visible connections (if and
    // only if they have an offset)
    let connectedLeftIndices = {};
    let connectedRightIndices = {};
    connections.forEach(d => {
      let [l, r] = d.split('_');
      connectedLeftIndices[l] = true;
      connectedRightIndices[r] = true;
    });
    leftItems.forEach(item => {
      if (!connectedLeftIndices[item.globalIndex] && item.details && item.details.navigationOffsets.length > 0) {
        connections.push(item.globalIndex + '_' + item.details.navigationOffsets[0]);
      }
    });
    rightItems.forEach(item => {
      if (!connectedRightIndices[item.globalIndex] && item.details && item.details.navigationOffsets.length > 0) {
        connections.push(item.details.navigationOffsets[0] + '_' + item.globalIndex);
      }
    });

    // common function for drawing the path between points
    let drawPath = d => {
      let [leftGlobalIndex, rightGlobalIndex] = d.split('_');
      let leftLocalIndex, rightLocalIndex;
      if (!joinModel.leftLookup[leftGlobalIndex]) {
        rightLocalIndex = joinModel.rightLookup[rightGlobalIndex].localIndex;
        // just connect the right end
        return 'M' + (rightItems[rightLocalIndex].location.x - 2 * this.emSize) + ',' +
                     rightItems[rightLocalIndex].location.y +
               'L' + rightItems[rightLocalIndex].location.x + ',' +
                     rightItems[rightLocalIndex].location.y;
      } else {
        leftLocalIndex = joinModel.leftLookup[leftGlobalIndex].localIndex;
        if (!joinModel.rightLookup[rightGlobalIndex]) {
          // just connect the left end
          return 'M' + leftItems[leftLocalIndex].location.x + ',' +
                       leftItems[leftLocalIndex].location.y +
                 'L' + (leftItems[leftLocalIndex].location.x + 2 * this.emSize) + ',' +
                       leftItems[leftLocalIndex].location.y;
        } else {
          rightLocalIndex = joinModel.rightLookup[rightGlobalIndex].localIndex;
          // connect both ends
          return 'M' + leftItems[leftLocalIndex].location.x + ',' +
                       leftItems[leftLocalIndex].location.y +
                 'L' + rightItems[rightLocalIndex].location.x + ',' +
                       rightItems[rightLocalIndex].location.y;
        }
      }
    };

    let lines = d3el.select('#lines').selectAll('.connection')
      .data(connections, d => d);

    lines.exit()
      .transition(commonTransition)
      .style('opacity', 0)
      .remove();

    let linesEnter = lines.enter().append('g')
      .classed('connection', true)
      .style('opacity', 0);

    linesEnter.append('path')
      .attr('d', drawPath);

    lines = linesEnter.merge(lines);
    lines.transition(commonTransition)
      .style('opacity', 1)
      .select('path').attr('d', drawPath);
  }
  draw (d3el) {
    // Common transition objects to coordiante all the animation
    let t = d3.transition()
      .duration(500);

    // Draw the dots on either side
    let leftItems = this.joinInterfaceView.getVisibleItemDetails(JoinInterfaceView.LEFT);
    this.drawPoints(d3el, JoinInterfaceView.LEFT, leftItems, t);
    let rightItems = this.joinInterfaceView.getVisibleItemDetails(JoinInterfaceView.RIGHT);
    this.drawPoints(d3el, JoinInterfaceView.RIGHT, rightItems, t);

    // Draw the lines
    this.drawLines(d3el, leftItems, rightItems, t);
  }
  scrollView (side, vector) {
    // Cheaply just translate the scrolled group instead of redrawing the points; this will be removed
    // when the view is re-rendered
    let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';
    this.d3el.select(containerSelector).attr('transform', 'translate(' + vector.dx + ',' + vector.dy + ')');
  }
}

export default Overlay;
