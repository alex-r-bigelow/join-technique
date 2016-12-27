class View {
  constructor () {
    this.d3el = null;
    this.dirty = false;
  }
  hasRenderedTo (d3el) {
    // Determine whether this is the first time we've rendered
    // inside this DOM element; return false if this is the first time
    // Also store the element as the last one that we rendered to

    let needsFreshRender = this.dirty;
    if (d3el) {
      if (this.d3el) {
        // only need to do a full render if the last element wasn't the same as this one
        needsFreshRender = this.dirty || d3el.node() !== this.d3el.node();
      } else {
        // we didn't have an element before
        needsFreshRender = true;
      }
      this.d3el = d3el;
    } else {
      if (!this.d3el) {
        // we weren't given a new element to render to, so use the last one
        throw new Error('Called render() without an element to render to (and no prior element has been specified)');
      }
    }
    this.dirty = false;
    return !needsFreshRender;
  }
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      d3el.html('<p>Error: render() not implemented</p>');
    }
  }
}

export default View;
