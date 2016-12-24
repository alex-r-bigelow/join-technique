/* globals FileReader */
import jQuery from 'jquery';
import Page from '../Page';
import PastePage from '../PastePage';
import StringDataTableModel from '../../StringDataTableModel';
import template from './template.html';

import './style.scss';

class MainPage extends Page {
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
    }
    this.d3el.select('#newButton').on('click', () => { this.newTable(); });
    this.d3el.select('#openButton').on('click', () => { this.openFileDialog(); });
    this.d3el.select('#pasteButton').on('click', () => { this.pasteData(); });
    this.d3el.select('#upload').on('change', () => { this.openFile(); });
  }
  pasteData () {
    this.parentView.setPage(new PastePage(this.parentView, this));
  }
  newTable () {
    let model = new StringDataTableModel('this,is,a,test\n,2,3,\n5,6,,8');
    this.parentView.joinInterfaceView.setModel(this.parentView, model);
    this.parentView.joinInterfaceView.openNextView(this.parentView);
  }
  openFileDialog () {
    jQuery(this.d3el.node()).find('#upload').click();
  }
  openFile () {
    let file = this.d3el.select('#upload').node().files[0];
    if (file) {
      if (file.size > 10485760) {
        // Deal with at most the first 10 MB of a file
        file = file.slice(0, 10485760);
      }
      let reader = new FileReader();
      reader.onload = fileContents => {
        // TODO
        console.log('loaded file:');
        console.log(fileContents);
      };
      reader.readAsText(file);
    }
  }
}

export default MainPage;
