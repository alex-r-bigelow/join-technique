import Page from '../Page';
import template from './template.html';

class ParsePage extends Page {
  constructor () {
    super(...arguments);
    this.showContinueButton = true;
  }
  setup (d3el) {
    d3el.html(template);
  }
  draw (d3el) {}
  proceed () {
    this.parentView.joinInterfaceView.openNextView(this.parentView);
  }
  get canProceed () {
    return true;
  }
}

export default ParsePage;
