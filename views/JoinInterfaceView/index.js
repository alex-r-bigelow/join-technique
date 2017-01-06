// import * as d3 from '../lib/d3.min.js';
import template from './template.html';
import './style.scss';

import JoinModel from '../../models/JoinModel';
import View from '../../lib/View';
import JoinableView from '../JoinableView';
import Overlay from './Overlay';

import hiddenIcon from '../../img/hide.svg';
import visibleIcon from '../../img/show.svg';

class JoinInterfaceView extends View {
  constructor (defaultLeftView, defaultRightView) {
    super();

    this.joinModel = new JoinModel(null, null);

    defaultLeftView.joinInterfaceView = this;
    this.leftViews = [defaultLeftView];
    this.currentLeftView = 0;
    this.showLeftView = true;

    defaultRightView.joinInterfaceView = this;
    this.rightViews = [defaultRightView];
    this.currentRightView = 0;
    this.showRightView = true;

    this.overlay = new Overlay(this);
  }
  addView (side, view) {
    view.joinInterfaceView = this;
    if (side === JoinInterfaceView.LEFT) {
      this.leftViews.push(view);
    } else if (side === JoinInterfaceView.RIGHT) {
      this.rightViews.push(view);
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  getSide (view) {
    if (this.leftViews.indexOf(view) !== -1) {
      return JoinInterfaceView.LEFT;
    } else if (this.rightViews.indexOf(view) !== -1) {
      return JoinInterfaceView.RIGHT;
    } else {
      throw new Error('JoinableView has not been added to JoinInterfaceView');
    }
  }
  setModel (side, model) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    if (side === JoinInterfaceView.LEFT) {
      this.joinModel.leftModel = model;
    } else if (side === JoinInterfaceView.RIGHT) {
      this.joinModel.rightModel = model;
    } else {
      throw new Error('Unknown side: ' + side);
    }
    // Clear all connections, and apply the default preset
    this.joinModel.applyPreset(JoinModel.CONCATENATION);
  }
  getModel (side) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    if (side === JoinInterfaceView.LEFT) {
      return this.joinModel.leftModel;
    } else if (side === JoinInterfaceView.RIGHT) {
      return this.joinModel.rightModel;
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  openNextView (side) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    if (side === JoinInterfaceView.LEFT) {
      this.currentLeftView = Math.min(this.leftViews.length - 1, this.currentLeftView + 1);
      // Let the view know that it needs to do a fresh render
      this.leftViews[this.currentLeftView].dirty = true;
    } else if (side === JoinInterfaceView.RIGHT) {
      this.currentRightView = Math.min(this.rightViews.length - 1, this.currentRightView + 1);
      // Let the view know that it needs to do a fresh render
      this.rightViews[this.currentRightView].dirty = true;
    } else {
      throw new Error('Unknown side: ' + side);
    }
    this.render();
  }
  getVisibleLocations (side) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    if (side === JoinInterfaceView.LEFT) {
      if (!this.showLeftView) {
        return {};
      } else {
        return this.leftViews[this.currentLeftView].visibleLocations;
      }
    } else if (side === JoinInterfaceView.RIGHT) {
      if (!this.showRightView) {
        return {};
      } else {
        return this.rightViews[this.currentRightView].visibleLocations;
      }
    } else {
      throw new Error('Unknown side: ' + side);
    }
  }
  scrollView (side, vector) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    this.overlay.scrollView(side, vector);
  }
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {
    // Have to manually update the overlay SVG size
    let bounds = d3el.select('#views').node().getBoundingClientRect();
    let overlayEl = d3el.select('#overlay')
      .attr('width', bounds.width)
      .attr('height', bounds.height);

    this.renderEachView(d3el);
    this.overlay.render(overlayEl);
    this.renderFooter(d3el);
  }
  renderEachView (d3el) {
    d3el.select('#leftView').classed('collapsed', !this.showLeftView);
    d3el.select('#leftView').classed('focused', !this.showRightView);
    d3el.select('#rightView').classed('collapsed', !this.showRightView);
    d3el.select('#rightView').classed('focused', !this.showLeftView);
    if (this.showLeftView) {
      this.leftViews[this.currentLeftView].render(d3el.select('#leftView'));
    }
    if (this.showRightView) {
      this.rightViews[this.currentRightView].render(d3el.select('#rightView'));
    }
  }
  renderFooter (d3el) {
    this.renderViewIcons(d3el);
  }
  renderViewIcons (d3el) {
    let iconList = [{
      icon: this.showLeftView ? visibleIcon : hiddenIcon
    }, ...this.leftViews];
    let leftIcons = d3el.select('#leftButtonContainer')
      .selectAll('.viewIcon')
      .data(iconList);

    iconList = [{
      icon: this.showRightView ? visibleIcon : hiddenIcon
    }, ...this.rightViews];
    let rightIcons = d3el.select('#rightButtonContainer')
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
        if (d instanceof JoinableView) {
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
        if (d instanceof JoinableView) {
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
JoinInterfaceView.LEFT = 'LEFT';
JoinInterfaceView.RIGHT = 'RIGHT';

export default JoinInterfaceView;