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

    [JoinInterfaceView.LEFT, JoinInterfaceView.RIGHT].forEach(side => {
      let locations = this.joinInterfaceView.getVisibleLocations(side);
      let containerSelector = side === JoinInterfaceView.LEFT ? '#leftPoints' : '#rightPoints';
      let points = this.d3el.select(containerSelector)
        .selectAll('g.point')
        .data(d3.entries(locations), d => d.key);
      points.exit().remove();
      let pointsEnter = points.enter()
        .append('g')
        .classed('point', true);
      pointsEnter.append('circle')
        .attr('r', 5);

      points = pointsEnter.merge(points);
      points.attr('transform', d => {
        return 'translate(' + d.value.x + ',' + d.value.y + ')';
      });
    });
  }
}

export default Overlay;
