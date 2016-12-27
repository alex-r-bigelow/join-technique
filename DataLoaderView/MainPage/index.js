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
    let testTable = 'this,is,a,test,to,see,if,the,table,behaves';
    let ec = testTable.split(',').length - 1;
    for (let r = 0; r < 200; r += 1) {
      testTable += '\n' + r;
      for (let c = 0; c < ec; c += 1) {
        testTable += ',' + Math.floor(Math.random() * 100);
      }
    }
    let model = new StringDataTableModel(testTable);
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
