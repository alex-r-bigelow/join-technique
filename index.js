import * as d3 from './lib/d3.min.js';
import jQuery from 'jquery';
import 'jquery-resizable-dom';
import './styles/layout.scss';
import './styles/fonts.scss';
import './styles/uihacks.scss';

// Make d3 and jQuery available on the console
window.d3 = d3;
window.jQuery = jQuery;

import recolorImages from './lib/recolorImages.js';
// import colorScheme from '!!sass-variable-loader!./colors.scss';
// TODO: getting a weird segfault when using sass-variable-loader...
// until I can pin down the exact problem, we'll manually list the colors
// here
let colorScheme = {
  darkUiColor: '#737373',
  lightUiColor: '#D9D9D9'
};
recolorImages(colorScheme);

import JoinInterfaceView from './views/JoinInterfaceView';
import DataLoaderView from './views/DataLoaderView';
import DataTableView from './views/DataTableView';

class Tool {
  constructor () {
    this.joinInterfaceView = new JoinInterfaceView(new DataLoaderView(), new DataLoaderView());
    this.joinInterfaceView.addView(JoinInterfaceView.LEFT, new DataTableView());
    this.joinInterfaceView.addView(JoinInterfaceView.RIGHT, new DataTableView());

    jQuery('#joinInterfaceView').resizable({
      handleSelector: '#splitter',
      resizeHeight: false,
      onDragEnd: () => this.renderViews()
    });
    window.onresize = () => this.renderViews();
    this.renderViews();
  }

  renderViews () {
    this.joinInterfaceView.render(d3.select('#joinInterfaceView'));
  }
}

window.tool = new Tool();
