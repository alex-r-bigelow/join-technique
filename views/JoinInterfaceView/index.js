// import * as d3 from '../lib/d3.min.js';
import template from './template.html';
import './style.scss';

import View from '../../lib/View';
import JoinableView from '../JoinableView';
import Overlay from './Overlay';
import makeSelectMenu from '../../lib/makeSelectMenu';

import Concatenation from '../../models/JoinModel/Concatenation';
import OrderedJoin from '../../models/JoinModel/OrderedJoin';
import CrossProduct from '../../models/JoinModel/CrossProduct';
import ThetaJoin from '../../models/JoinModel/ThetaJoin';
let PRESETS = {
  Concatenation,
  OrderedJoin,
  CrossProduct,
  ThetaJoin
};

import hiddenIcon from '../../img/hide.svg';
import visibleIcon from '../../img/show.svg';

class JoinInterfaceView extends View {
  constructor (defaultLeftView, defaultRightView) {
    super();

    this.joinModel = new PRESETS.Concatenation();
    this.joinModel.on('update', () => {
      this.render();
    });

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
      if (this.joinModel.rightModel && this.joinModel.rightModel.name === model.name) {
        model.name += '_2';
      }
    } else if (side === JoinInterfaceView.RIGHT) {
      this.joinModel.rightModel = model;
      if (this.joinModel.leftModel && this.joinModel.leftModel.name === model.name) {
        model.name += '_2';
      }
    } else {
      throw new Error('Unknown side: ' + side);
    }
    // Clear all connections, and apply the default preset
    this.joinModel = new PRESETS.Concatenation(this.joinModel.leftModel, this.joinModel.rightModel);
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
  changePreset (preset) {
    if (this instanceof PRESETS[preset]) {
      // Nothing is actually changing... so we can leave things as they were
      return this;
    }
    // TODO: this clears all the customizations; should we copy those to the
    // new model as well?
    return new PRESETS[preset](this.joinModel.leftModel, this.joinModel.rightModel,
      this.joinModel.leftIndices, this.joinModel.rightIndices,
      this.joinModel.leftItems, this.joinModel.rightItems);
  }
  updateVisibleItems () {
    let leftIndices = this.showLeftView ? this.leftViews[this.currentLeftView].globalIndices : [];
    let rightIndices = this.showRightView ? this.rightViews[this.currentRightView].globalIndices : [];
    this.joinModel.changeFocusItems(leftIndices, rightIndices);
  }
  getVisibleItemDetails (side) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    let localToGlobalIndex = [];
    let globalIndexToLocation = {};
    let globalIndexToDetails = {};
    if (side === JoinInterfaceView.LEFT) {
      if (this.showLeftView) {
        localToGlobalIndex = this.leftViews[this.currentLeftView].globalIndices;
        globalIndexToLocation = this.leftViews[this.currentLeftView].visibleLocations;
        globalIndexToDetails = this.joinModel.leftLookup;
      }
    } else if (side === JoinInterfaceView.RIGHT) {
      if (this.showRightView) {
        localToGlobalIndex = this.rightViews[this.currentRightView].globalIndices;
        globalIndexToLocation = this.rightViews[this.currentRightView].visibleLocations;
        globalIndexToDetails = this.joinModel.rightLookup;
      }
    } else {
      throw new Error('Unknown side: ' + side);
    }

    return localToGlobalIndex.map(globalIndex => {
      return {
        globalIndex,
        location: globalIndexToLocation[globalIndex],
        details: globalIndexToDetails[globalIndex]
      };
    });
  }
  scrollView (side, vector) {
    if (side instanceof JoinableView) {
      side = this.getSide(side);
    }
    this.overlay.scrollView(side, vector);
  }
  setup (d3el) {
    d3el.html(template);
    makeSelectMenu(d3el.select('#presetSettings').node());
    let self = this;
    let thetaExpressionElement = d3el.select('#thetaExpression');
    d3el.select('#presetSettings').on('change', function () {
      // this refers to the DOM element
      self.joinModel = self.changePreset(this.value);
      if (this.value === 'ThetaJoin') {
        thetaExpressionElement.style('display', null);
        let oldExpression = thetaExpressionElement.property('value');
        if (!oldExpression) {
          self.joinModel.autoInferThetaExpression(expression => {
            thetaExpressionElement.property('value', expression);
            self.joinModel.setExpression(expression);
          });
        } else {
          self.joinModel.setExpression(oldExpression);
        }
      } else {
        thetaExpressionElement.style('display', 'none');
      }
      self.draw(d3el);
    });
    thetaExpressionElement.on('change', function () {
      // this refers to the DOM element
      self.joinModel.setExpression(this.value);
    });
  }
  draw (d3el) {
    // Have to manually update the overlay SVG size
    let bounds = d3el.select('#views').node().getBoundingClientRect();
    let overlayEl = d3el.select('#overlay')
      .attr('width', bounds.width)
      .attr('height', bounds.height)
      .attr('viewBox', bounds.left + ' ' + bounds.top + ' ' + bounds.width + ' ' + bounds.height);

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
        this.updateVisibleItems();
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
        this.updateVisibleItems();
        this.render();
      });
  }
}
JoinInterfaceView.LEFT = 'LEFT';
JoinInterfaceView.RIGHT = 'RIGHT';

export default JoinInterfaceView;
