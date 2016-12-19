import Page from '../Page';
import ParsePage from '../ParsePage';
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
  }
  proceed () {
    this.parentView.setPage(new ParsePage(this.parentView, this));
  }
  get canProceed () {
    return true;
  }
}

export default PastePage;
