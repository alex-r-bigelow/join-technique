import View from '../../../lib/View';

class Page extends View {
  constructor (parentView, prevPage) {
    super();
    this.parentView = parentView;
    this.prevPage = prevPage || null;
    this.showContinueButton = false;
  }
  goBack () {
    if (this.prevPage !== null) {
      this.parentView.setPage(this.prevPage);
    }
  }
  proceed () {
    throw new Error('Undefined continue button behavior');
  }
  get canProceed () {
    return false;
  }
}

export default Page;
