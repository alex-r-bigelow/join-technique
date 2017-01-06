import AbstractClass from '../AbstractClass';

class View extends AbstractClass {
  constructor () {
    super();
    this.d3el = null;
    this.dirty = false;
    this.drawTimeout = null;
    this.debounceWait = 200;
    this.require(['setup', 'draw']);
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
      } else {
        d3el = this.d3el;
      }
    }
    this.dirty = false;
    return !needsFreshRender;
  }
  render (d3el) {
    d3el = d3el || this.d3el;
    if (!this.hasRenderedTo(d3el)) {
      // Call setup immediately
      this.setup(d3el);
      this.d3el = d3el;
    }
    // Debounce the actual draw call
    clearTimeout(this.drawTimeout);
    this.drawTimeout = setTimeout(() => {
      this.drawTimeout = null;
      this.draw(d3el);
    }, this.debounceWait);
  }
}

export default View;
