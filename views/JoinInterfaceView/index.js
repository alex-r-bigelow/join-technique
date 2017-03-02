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

import emptyIndicator from '../../img/empty.svg';
import loadingIndicator from '../../img/spinner.svg';
import finishedIndicator from '../../img/checkMark.svg';
let INDICATORS = {
  EMPTY: emptyIndicator,
  COMPUTING: loadingIndicator,
  FINISHED: finishedIndicator
};

class JoinInterfaceView extends View {
  constructor (defaultLeftView, defaultRightView) {
    super();

    this.changePreset('Concatenation');

    defaultLeftView.joinInterfaceView = this;
    this.leftViews = [defaultLeftView];
    this.currentLeftView = 0;

    defaultRightView.joinInterfaceView = this;
    this.rightViews = [defaultRightView];
    this.currentRightView = 0;

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
    // Apply the default (empty) preset
    this.changePreset('Concatenation');
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
    if (!this.joinModel) {
      // Only happens when called from the constructor
      this.joinModel = new PRESETS[preset]();
    } else if (this.joinModel instanceof PRESETS[preset]) {
      // Nothing is actually changing... so we can leave things as they were
      return;
    } else {
      // TODO: this clears all the customizations; should we copy those to the
      // new model as well?
      this.joinModel = new PRESETS[preset](
        this.joinModel.leftModel, this.joinModel.rightModel,
        this.joinModel.leftIndices, this.joinModel.rightIndices,
        this.joinModel.leftItems, this.joinModel.rightItems);
    }
    this.joinModel.on('update', () => {
      this.render();
    });
  }
  updateVisibleItems () {
    let leftIndices = this.leftViews[this.currentLeftView].globalIndices;
    let rightIndices = this.rightViews[this.currentRightView].globalIndices;
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
      localToGlobalIndex = this.leftViews[this.currentLeftView].globalIndices;
      globalIndexToLocation = this.leftViews[this.currentLeftView].visibleLocations;
      globalIndexToDetails = this.joinModel.leftLookup;
    } else if (side === JoinInterfaceView.RIGHT) {
      localToGlobalIndex = this.rightViews[this.currentRightView].globalIndices;
      globalIndexToLocation = this.rightViews[this.currentRightView].visibleLocations;
      globalIndexToDetails = this.joinModel.rightLookup;
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
      self.changePreset(this.value);
      if (this.value === 'ThetaJoin') {
        thetaExpressionElement.style('display', null);
        let oldExpression = thetaExpressionElement.property('value');
        if (!oldExpression) {
          self.joinModel.autoInferThetaExpression(expression => {
            thetaExpressionElement.property('value', expression);
            self.joinModel.setExpression(expression)
              .then(() => { self.render(); });
          });
        } else {
          self.joinModel.setExpression(oldExpression)
            .then(() => { self.render(); });
        }
      } else {
        thetaExpressionElement.style('display', 'none');
      }
      self.render();
    });
    thetaExpressionElement.on('change', function () {
      // this refers to the DOM element
      self.joinModel.setExpression(this.value)
        .then(() => { self.render(); });
      self.render();
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
    this.renderHeader(d3el);
  }
  renderEachView (d3el) {
    this.leftViews[this.currentLeftView].render(d3el.select('#leftView'));
    this.rightViews[this.currentRightView].render(d3el.select('#rightView'));
  }
  renderHeader (d3el) {
    this.renderViewIcons(d3el);
    d3el.select('#leftTitle')
      .text(this.joinModel.leftModel === null
        ? '(no data loaded)' : this.joinModel.leftModel.name);
    d3el.select('#rightTitle')
      .text(this.joinModel.rightModel === null
        ? '(no data loaded)' : this.joinModel.rightModel.name);

    d3el.select('#leftIndicator')
      .attr('src', INDICATORS[this.joinModel.leftConnectionStatus]);
    d3el.select('#rightIndicator')
      .attr('src', INDICATORS[this.joinModel.rightConnectionStatus]);
    d3el.select('#connectionIndicator')
      .attr('src', INDICATORS[this.joinModel.visibleConnectionStatus]);
  }
  renderViewIcons (d3el) {
    let leftIcons = d3el.select('#leftButtonContainer')
      .selectAll('.viewIcon')
      .data(this.leftViews);

    let rightIcons = d3el.select('#rightButtonContainer')
      .selectAll('.viewIcon')
      .data(this.rightViews);

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
      .classed('inactive', (d, i) => {
        // if there's no left model loaded, only enable the first (loading) view
        return !this.joinModel.leftModel && i > 0;
      }).on('click', (d, i) => {
        this.currentLeftView = i;
        this.leftViews[this.currentLeftView].dirty = true;
        this.leftViews[this.currentLeftView].render();
        this.updateVisibleItems();
      });
    rightIcons
      .classed('inactive', (d, i) => {
        // if there's no left model loaded, only enable the first (loading) view
        return !this.joinModel.rightModel && i > 0;
      })
      .on('click', (d, i) => {
        this.currentRightView = i;
        this.rightViews[this.currentRightView].dirty = true;
        this.rightViews[this.currentRightView].render();
        this.updateVisibleItems();
      });
  }
}
JoinInterfaceView.LEFT = 'LEFT';
JoinInterfaceView.RIGHT = 'RIGHT';

export default JoinInterfaceView;
