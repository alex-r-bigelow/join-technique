import * as d3 from './lib/d3.min.js';
import jQuery from 'jquery';
import 'jquery-resizable-dom';
import './layout.scss';
import './fonts.scss';

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

import JoinInterface from './JoinInterface';
import DataLoaderView from './DataLoaderView';
import DataTableView from './DataTableView';

let joinInterface = new JoinInterface(d3.select('#joinInterface'), new DataLoaderView(), new DataLoaderView());
joinInterface.addView(JoinInterface.LEFT, new DataTableView());
joinInterface.addView(JoinInterface.RIGHT, new DataTableView());

function renderViews () {
  joinInterface.render();
}

jQuery('#joinInterface').resizable({
  handleSelector: '#splitter',
  resizeHeight: false,
  onDragEnd: renderViews
});
window.onresize = renderViews;
renderViews();
