// import * as d3 from '../lib/d3.min.js';
import template from './template.html';
import './style.scss';

class JoinInterface {
  constructor (d3el, defaultLeftView, defaultRightView) {
    this.d3el = d3el;
    this.leftModel = null;
    this.leftViews = [defaultLeftView];
    this.currentLeftView = 0;
    this.rightModel = null;
    this.rightViews = [defaultRightView];
    this.currentRightView = 0;
  }
  addView (side, view) {
    view.joinInterface = this;
    if (side === JoinInterface.LEFT) {
      this.leftViews.push(view);
    } else {
      this.rightViews.push(view);
    }
  }
  setModel (side, model) {
    if (side === JoinInterface.LEFT) {
      this.leftModel = model;
    } else {
      this.rightModel = model;
    }
  }
  render () {
    if (!this.addedTemplate) {
      this.d3el.html(template);
      this.addedTemplate = true;
    }
    // Render each view
    this.leftViews[this.currentLeftView].render(this.d3el.select('#leftView'));
    this.rightViews[this.currentRightView].render(this.d3el.select('#rightView'));

    // Render the overlay

    // Render the footer
  }
}
JoinInterface.LEFT = 0;
JoinInterface.RIGHT = 0;

export default JoinInterface;
