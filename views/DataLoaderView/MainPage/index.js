import jQuery from 'jquery';
import Page from '../Page';
import PastePage from '../PastePage';
import template from './template.html';

import './style.scss';

class MainPage extends Page {
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {
    d3el.select('#newButton').on('click', () => { this.newTable(); });
    d3el.select('#openButton').on('click', () => { this.openFileDialog(d3el); });
    d3el.select('#pasteButton').on('click', () => { this.pasteData(); });
    d3el.select('#upload').on('change', () => { this.openFile(d3el); });
  }
  pasteData () {
    this.parentView.setPage(new PastePage(this.parentView, this));
  }
  newTable () {
    this.parentView.loadEmptyTable();
  }
  openFileDialog (d3el) {
    jQuery(d3el.node()).find('#upload').click();
  }
  openFile (d3el) {
    let fileObj = d3el.select('#upload').node().files[0];
    if (fileObj) {
      this.parentView.loadFile(fileObj);
    }
  }
}

export default MainPage;
