import jQuery from 'jquery';
import JoinableView from '../JoinableView';
import GraphicsModel from '../../models/GraphicsModel';
import template from './template.html';
import './style.scss';

import uploadIcon from '../../img/upload.svg';

class GraphicsLoaderView extends JoinableView {
  constructor () {
    super();
    this.icon = uploadIcon;
  }
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {
    d3el.select('#newButton').on('click', () => {
      this.loadSvgString('Untitled Graphics', '<svg width="512px" height="512px"></svg>');
    });
    d3el.select('#openButton').on('click', () => { this.openFileDialog(d3el); });
    d3el.select('#upload').on('change', () => { this.openFile(d3el); });
  }
  loadSvgString (name, textContent) {
    let model = new GraphicsModel(name, textContent);
    this.joinInterfaceView.setModel(this, model);
    this.joinInterfaceView.openNextView(this);
  }
  openFileDialog (d3el) {
    jQuery(d3el.node()).find('#upload').click();
  }
  openFile (d3el) {
    let fileObj = d3el.select('#upload').node().files[0];
    if (fileObj) {
      let reader = new window.FileReader();
      reader.onload = loadEvent => {
        this.loadSvgString(fileObj.name, loadEvent.target.result);
      };
      reader.readAsText(fileObj);
    }
  }
}

export default GraphicsLoaderView;
