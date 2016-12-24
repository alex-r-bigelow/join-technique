import Page from '../Page';
import template from './template.html';

class ParsePage extends Page {
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
    this.parentView.joinInterfaceView.openNextView(this.parentView);
  }
  get canProceed () {
    return true;
  }
}

export default ParsePage;
