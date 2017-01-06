import JoinableView from '../JoinableView';
import MainPage from './MainPage';
import template from './template.html';
import StringTable from '../../models/DataTableModel/StringTable';
import DsvMixin from '../../models/DataTableModel/DsvMixin';
import ParsePage from './ParsePage';
import './style.scss';

import uploadIcon from '../../img/upload.svg';

const MIME_TO_MIXIN = {
  'text/csv': DsvMixin
  // TODO: implement more parsing tools (i.e. for JSON, XML, etc)
};
const LARGE_CUTOFF = 10485760;  // 10 MB

class DataLoaderView extends JoinableView {
  constructor () {
    super();
    this.icon = uploadIcon;
    this.page = new MainPage(this, null);
  }
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {
    d3el.select('#status').text(() => {
      if (this.model) {
        return 'Loaded: ' + this.model.name;
      } else {
        return 'No data loaded';
      }
    });
    this.page.render(d3el.select('#pageContent'));
    d3el.select('#backButton')
      .style('display', this.page.prevPage === null ? 'none' : null)
      .on('click', () => { this.page.goBack(); });
    d3el.select('#continueButton')
      .style('display', this.page.showContinueButton ? null : 'none')
      .classed('disabled', !(this.page.canProceed))
      .on('click', () => { this.page.proceed(); });
  }
  setPage (page) {
    this.page = page;
    // let the page know that it needs to do a fresh render of the element
    this.page.dirty = true;
    // update the whole view
    this.render();
  }
  loadFile (fileObj) {
    if (!MIME_TO_MIXIN[fileObj.type]) {
      throw new Error('Sorry, no support yet for ' + fileObj.type + ' files');
    }
    if (fileObj.size > LARGE_CUTOFF) {
      // TODO: create (and implement) a FileTable
      throw new Error('Sorry, no support yet for files larger than 10MB');
    } else {
      // The file is small enough to read into memory... so actually create
      // a string table instead
      let reader = new window.FileReader();
      reader.onload = fileContents => {
        let MixedClass = MIME_TO_MIXIN[fileObj.type](StringTable);
        let model = new MixedClass(fileObj.name, fileContents);
        this.joinInterfaceView.setModel(this, model);
        this.setPage(new ParsePage(this, this));
      };
      reader.readAsText(fileObj);
    }
  }
  loadString (name, textContent, mimeType) {
    let MixedClass = MIME_TO_MIXIN[mimeType](StringTable);
    let model = new MixedClass(name, textContent);
    this.joinInterfaceView.setModel(this, model);
    this.setPage(new ParsePage(this, this));
  }
  loadEmptyTable () {
    let testTable = 'this,is,a,test,to,see,if,the,table,behaves';
    let ec = testTable.split(',').length - 1;
    for (let r = 0; r < 200; r += 1) {
      testTable += '\n' + r;
      for (let c = 0; c < ec; c += 1) {
        testTable += ',' + Math.floor(Math.random() * 100);
      }
    }
    let mimeType = 'text/csv';
    let MixedClass = MIME_TO_MIXIN[mimeType](StringTable);
    let model = new MixedClass('Untitled Table', testTable);
    this.joinInterfaceView.setModel(this, model);
    this.joinInterfaceView.openNextView(this);
  }
}

export default DataLoaderView;
