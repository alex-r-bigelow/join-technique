// import * as d3 from '../lib/d3.min.js';
import template from './template.html';
import './style.scss';

import View from '../View';

import hiddenIcon from '../img/hide.svg';
import visibleIcon from '../img/show.svg';

class JoinInterface {
  constructor (d3el, defaultLeftView, defaultRightView) {
    this.d3el = d3el;
    this.leftModel = null;
    defaultLeftView.joinInterface = this;
    this.leftViews = [defaultLeftView];
    this.currentLeftView = 0;
    this.showLeftView = true;
    this.rightModel = null;
    defaultRightView.joinInterface = this;
    this.rightViews = [defaultRightView];
    this.currentRightView = 0;
    this.showRightView = true;
  }
  addView (side, view) {
    view.joinInterface = this;
    if (side === JoinInterface.LEFT) {
      this.leftViews.push(view);
    } else if (side === JoinInterface.RIGHT) {
      this.rightViews.push(view);
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  getSide (view) {
    if (this.leftViews.indexOf(view) !== -1) {
      return JoinInterface.LEFT;
    } else if (this.rightViews.indexOf(view) !== -1) {
      return JoinInterface.RIGHT;
    } else {
      throw new Error('View has not been added to JoinInterface');
    }
  }
  setModel (side, model) {
    if (side instanceof View) {
      side = this.getSide(side);
    }
    if (side === JoinInterface.LEFT) {
      this.leftModel = model;
    } else if (side === JoinInterface.RIGHT) {
      this.rightModel = model;
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  getModel (side) {
    if (side instanceof View) {
      side = this.getSide(side);
    }
    if (side === JoinInterface.LEFT) {
      return this.leftModel;
    } else if (side === JoinInterface.RIGHT) {
      return this.rightModel;
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  openNextView (side) {
    if (side instanceof View) {
      side = this.getSide(side);
    }
    if (side === JoinInterface.LEFT) {
      this.currentLeftView = Math.min(this.leftViews.length - 1, this.currentLeftView + 1);
    } else if (side === JoinInterface.RIGHT) {
      this.currentRightView = Math.min(this.rightViews.length - 1, this.currentRightView + 1);
    } else {
      throw new Error('Unknown side: ' + side);
    }
    // Let the view know that it needs to do a fresh render
    this.leftViews[this.currentLeftView].d3el = null;
    this.render();
  }
  render () {
    if (!this.addedTemplate) {
      this.d3el.html(template);
      this.addedTemplate = true;
    }
    // Have to manually update the overlay SVG size
    let bounds = this.d3el.select('#views').node().getBoundingClientRect();
    this.d3el.select('#overlay')
      .attr('width', bounds.width)
      .attr('height', bounds.height);

    this.renderEachView();
    this.renderOverlay();
    this.renderFooter();
  }
  renderEachView () {
    if (this.showLeftView) {
      this.leftViews[this.currentLeftView].render(this.d3el.select('#leftView'));
    }
    this.d3el.select('#leftView').classed('collapsed', !this.showLeftView);
    this.d3el.select('#leftView').classed('focused', !this.showRightView);
    if (this.showRightView) {
      this.rightViews[this.currentRightView].render(this.d3el.select('#rightView'));
    }
    this.d3el.select('#rightView').classed('collapsed', !this.showRightView);
    this.d3el.select('#rightView').classed('focused', !this.showLeftView);
  }
  renderOverlay () {
    // todo
  }
  renderFooter () {
    this.renderViewIcons();
  }
  renderViewIcons () {
    let iconList = [{
      icon: this.showLeftView ? visibleIcon : hiddenIcon
    }, ...this.leftViews];
    let leftIcons = this.d3el.select('#leftButtonContainer')
      .selectAll('.viewIcon')
      .data(iconList);

    iconList = [{
      icon: this.showRightView ? visibleIcon : hiddenIcon
    }, ...this.rightViews];
    let rightIcons = this.d3el.select('#rightButtonContainer')
      .selectAll('.viewIcon')
      .data(iconList);

    // Funky way to create / setup common stuff to both sets of icons...
    let temp = [leftIcons, rightIcons].map(icons => {
      icons.exit().remove();
      icons = icons.enter().append('img')
        .classed('viewIcon', true)
        .merge(icons);
      icons.attr('src', d => d.icon);

      return icons;
    });
    leftIcons = temp[0];
    rightIcons = temp[1];

    leftIcons
      .classed('inactive', !this.showLeftView)
      .on('click', (d, i) => {
        if (d instanceof View) {
          this.currentLeftView = i - 1;
          this.showLeftView = true;
        } else {
          this.showLeftView = !this.showLeftView;
          if (!this.showLeftView) {
            this.showRightView = true;
          }
        }
        this.render();
      });
    rightIcons
      .classed('inactive', !this.showRightView)
      .on('click', (d, i) => {
        if (d instanceof View) {
          this.currentRightView = i - 1;
          this.showRightView = true;
        } else {
          this.showRightView = !this.showRightView;
          if (!this.showRightView) {
            this.showLeftView = true;
          }
        }
        this.render();
      });
  }
}
JoinInterface.LEFT = 0;
JoinInterface.RIGHT = 0;

export default JoinInterface;
