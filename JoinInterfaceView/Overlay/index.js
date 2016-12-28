import * as d3 from '../../lib/d3.min.js';

import View from '../../View';
import JoinInterfaceView from '../index.js';
import template from './template.svg';

class Overlay extends View {
  constructor (joinInterfaceView) {
    super();

    this.joinInterfaceView = joinInterfaceView;
  }
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
    }

    let t = d3.transition()
      .duration(1000);
    [JoinInterfaceView.LEFT, JoinInterfaceView.RIGHT].forEach(side => {
      let allLocations = this.joinInterfaceView.getVisibleLocations(side);
      let newLocations = d3.entries(allLocations).filter(d => !allLocations[d.key].transitioning);
      let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';

      // First, the data binding...
      let points = this.d3el.select(containerSelector)
        .selectAll('g.point')
        .data(newLocations, d => d.key);

      // Get rid of any leaving points before we do anything so they don't flash into view
      points.exit().remove();

      // Next, clear off any scrolling that just happened to this container
      this.d3el.select(containerSelector).attr('transform', null);

      // Functions to help assign the starting and target locations for items
      // in the animation
      let targetLocationFunc = function (d) {
        return 'translate(' + allLocations[d.key].x + ',' + allLocations[d.key].y + ')';
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
  }
  scrollView (side, vector) {
    let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';
    this.d3el.select(containerSelector).attr('transform', 'translate(' + vector.dx + ',' + vector.dy + ')');
  }
}

export default Overlay;
