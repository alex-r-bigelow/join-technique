import Page from '../Page';
import ParsePage from '../ParsePage';
import StringDataTableModel from '../../StringDataTableModel';
import template from './template.html';

class PastePage extends Page {
  constructor () {
    super(...arguments);
    this.showContinueButton = true;
  }
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
    }
    this.d3el.select('#pasteArea').on('change', () => { this.parentView.render(); });
  }
  proceed () {
    let model = new StringDataTableModel(this.d3el.select('#pasteArea').node().value);
    this.parentView.joinInterface.setModel(this.parentView, model);
    this.parentView.setPage(new ParsePage(this.parentView, this));
  }
  get canProceed () {
    return this.d3el.select('#pasteArea').node().value.length > 0;
  }
}

export default PastePage;
