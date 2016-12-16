import * as d3 from '../lib/d3.min.js';
import makeValidId from '../lib/makeValidId.js';

class Item {
  constructor (id) {
    this.id = makeValidId(id);
  }
  render (element, joinInterface) {
    let el = d3.select(element);
    if (!this.addedCircle) {
      el.append('circle');
      this.addedCircle = true;
    }
    el.select('circle')
      .attr('r', 5)
      .attr('fill', joinInterface.labelColors(this.label));
  }
}

export default Item;
