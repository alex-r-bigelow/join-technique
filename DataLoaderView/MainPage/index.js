import Page from '../Page';
import PastePage from '../PastePage';
import template from './template.html';

class MainPage extends Page {
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
    }
    this.d3el.select('#newButton').on('click', this.newTable);
    this.d3el.select('#openButton').on('click', this.openFile);
    this.d3el.select('#pasteButton').on('click', () => { this.pasteData(); });
  }
  pasteData () {
    this.parentView.setPage(new PastePage(this.parentView, this));
  }
}

export default MainPage;
