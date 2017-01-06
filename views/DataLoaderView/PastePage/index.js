import Page from '../Page';
import template from './template.html';

class PastePage extends Page {
  constructor () {
    super(...arguments);
    this.showContinueButton = true;
  }
  setup (d3el) {
    d3el.html(template);
    d3el.select('#pasteArea').on('change', () => { this.parentView.render(); });
  }
  draw (d3el) {}
  proceed () {
    let text = this.d3el.select('#pasteArea').node().value;
    this.parentView.loadString('Untitled Table', text, 'text/csv');
  }
  get canProceed () {
    return this.d3el.select('#pasteArea').node().value.length > 0;
  }
}

export default PastePage;
