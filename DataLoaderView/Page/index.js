class Page {
  constructor (parentView, prevPage) {
    this.parentView = parentView;
    this.prevPage = prevPage || null;
    this.showContinueButton = false;
  }
  hasRenderedTo (d3el) {
    // Determine whether this is the first time we've rendered
    // inside this DOM element; return false if this is the first time
    if (!d3el) {
      // default: use the last element we were given
      d3el = this.d3el;
      return true;
    } else if (d3el !== this.d3el) {
      // we were just given a new element; switch to using it
      this.d3el = d3el;
      return false;
    } else {
      return true;
    }
  }
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      d3el.html('<p>Error: render() not implemented</p>');
    }
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
