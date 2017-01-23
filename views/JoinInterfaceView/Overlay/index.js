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
  draw (d3el) {
    // Common transition object to coordiante all the animation
    let t = d3.transition()
      .duration(1000);

    // Draw the dots on either side
    let allLocations = {};
    [JoinInterfaceView.LEFT, JoinInterfaceView.RIGHT].forEach(side => {
      allLocations[side] = this.joinInterfaceView.getVisibleLocations(side);
      let newLocations = d3.entries(allLocations[side]).filter(d => !allLocations[side][d.key].transitioning);
      let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';

      // First, the data binding...
      let points = d3el.select(containerSelector)
        .selectAll('g.point')
        .data(newLocations, d => d.key);

      // Get rid of any leaving points before we do anything so they don't flash into view
      points.exit().remove();

      // Next, clear off any scrolling that just happened to this container
      d3el.select(containerSelector).attr('transform', null);

      // Functions to help assign the starting and target locations for items
      // in the animation
      let targetLocationFunc = function (d) {
        return 'translate(' + allLocations[side][d.key].x + ',' + allLocations[side][d.key].y + ')';
      };

      // Apply the new information / start the animations
      let pointsEnter = points.enter()
        .append('g')
        .classed('point', true)
        .style('opacity', 0);
      pointsEnter.append('circle')
        .attr('r', 5);
      points = pointsEnter.merge(points);
      points.attr('transform', targetLocationFunc)
        .transition(t)
        .style('opacity', 1);
    });

    // Consolidate the lines for each index that are not visible on
    // the other side
    let leftSoloIndices = {};
    let rightSoloIndices = {};
    let allConnections = this.joinInterfaceView.getVisibleConnections();
    if (allConnections.length > 0) {
      allConnections = allConnections.reduce((result, d) => {
        if (allLocations[JoinInterfaceView.LEFT][d.leftKey]) {
          if (allLocations[JoinInterfaceView.RIGHT][d.rightKey]) {
            // Leave complete collections alone
            d.count = 1;
            result.push(d);
          } else {
            // We have a connection on the left, but not the right
            if (leftSoloIndices[d.leftKey]) {
              // add to the count, but don't add the connection
              result[leftSoloIndices[d.leftKey]].count += 1;
            } else {
              // point to the first solo connection for this edge
              leftSoloIndices[d.leftKey] = result.length;
              d.count = 1;
              result.push(d);
            }
          }
        } else {
          if (allLocations[JoinInterfaceView.RIGHT][d.rightKey]) {
            // We have a connection on the right, but not the left
            if (rightSoloIndices[d.rightKey]) {
              // add to the count, but don't add the connection
              result[rightSoloIndices[d.rightKey]].count += 1;
            } else {
              // point to the first solo connection for this edge
              rightSoloIndices[d.rightKey] = result.length;
              d.count = 1;
              result.push(d);
            }
          } // else {
            // Neither side has a visible connection; don't include
            // it in the results
          // }
        }
        return result;
      });
    }

    // Okay, let's draw the lines
    let connections = d3el.select('#lines').selectAll('.connection')
      .data(allConnections);

    connections.exit()
      .transition(t)
      .style('opacity', 0)
      .remove();

    let connectionsEnter = connections.enter().append('g')
      .classed('connection', true)
      .style('opacity', 0);

    connectionsEnter.append('path');
    connectionsEnter.append('text');

    connections = connectionsEnter.merge(connections);
    connections.transition(t)
      .style('opacity', 1);

    connections.selectAll('path').attr('d', d => {
      if (allLocations[JoinInterfaceView.LEFT][d.leftKey]) {
        if (allLocations[JoinInterfaceView.RIGHT][d.rightKey]) {
          // Connect both ends
          return 'M' + allLocations[JoinInterfaceView.LEFT][d.leftKey].x + ',' +
                       allLocations[JoinInterfaceView.LEFT][d.leftKey].y +
                 'L' + allLocations[JoinInterfaceView.RIGHT][d.rightKey].x + ',' +
                       allLocations[JoinInterfaceView.RIGHT][d.rightKey].y;
        } else {
          // Just connect the left end
          return 'M' + allLocations[JoinInterfaceView.LEFT][d.leftKey].x + ',' +
                       allLocations[JoinInterfaceView.LEFT][d.leftKey].y +
                 'L' + (allLocations[JoinInterfaceView.LEFT][d.leftKey].x + 2 * this.emSize) + ',' +
                       allLocations[JoinInterfaceView.LEFT][d.leftKey].y;
        }
      } else {
        // Just connect the right end
        return 'M' + allLocations[JoinInterfaceView.RIGHT][d.rightKey].x + ',' +
                     allLocations[JoinInterfaceView.RIGHT][d.rightKey].y +
               'L' + (allLocations[JoinInterfaceView.RIGHT][d.rightKey].x - 2 * this.emSize) + ',' +
                     allLocations[JoinInterfaceView.RIGHT][d.rightKey].y;
      }
    });
    connections.selectAll('text')
      .text(d => {
        if (allLocations[JoinInterfaceView.LEFT][d.leftKey] &&
            allLocations[JoinInterfaceView.RIGHT][d.rightKey]) {
          return '';
        } else {
          return d.count;
        }
      }).attr('x', d => {
        if (allLocations[JoinInterfaceView.LEFT][d.leftKey]) {
          return allLocations[JoinInterfaceView.LEFT][d.leftKey].x + 3 * this.emSize;
        } else {
          return allLocations[JoinInterfaceView.RIGHT][d.rightKey].x - 3 * this.emSize;
        }
      }).attr('y', d => {
        if (allLocations[JoinInterfaceView.LEFT][d.leftKey]) {
          return allLocations[JoinInterfaceView.LEFT][d.leftKey].y + 0.35 * this.emSize;
        } else {
          return allLocations[JoinInterfaceView.RIGHT][d.rightKey].y + 0.35 * this.emSize;
        }
      });
  }
  scrollView (side, vector) {
    // Cheaply just translate the scrolled group instead of redrawing the points; this will be removed
    // when the view is re-rendered
    let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';
    this.d3el.select(containerSelector).attr('transform', 'translate(' + vector.dx + ',' + vector.dy + ')');
  }
}

export default Overlay;
