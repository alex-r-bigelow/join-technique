import * as d3 from './lib/d3.min.js';
import jQuery from 'jquery';
import 'jquery-resizable-dom';
import './style.scss';

import JoinInterface from './JoinInterface';
import DataLoaderView from './DataLoaderView';

let joinInterface = new JoinInterface(d3.select('#joinInterface'), new DataLoaderView(), new DataLoaderView());

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
