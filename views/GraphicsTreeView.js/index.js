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

    // A flag to force an update of the visible positions
    this.firstRender = true;
  }
  draw (d3el) {
    // d3el.select('#graphicsContent').html(this.model.)

    this.updateVisibleLocations(d3el);
  }
  updateVisibleLocations (d3el) {
    // TODO
  }
}

export default GraphicsDirectView;
