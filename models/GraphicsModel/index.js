/* globals DOMParser, Element */

import jQuery from 'jquery';
import JoinableModel from '../JoinableModel';

class GraphicsModel extends JoinableModel {
  constructor (name, xmlText) {
    super(name);
    this.xmlText = xmlText;
    this.doc = new DOMParser().parseFromString(xmlText, 'image/svg+xml');
    this.rootSelector = 'svg';
  }
  getSelector (element) {
    // this function blatantly adapted from http://stackoverflow.com/questions/3620116/get-css-path-from-dom-element
    if (!(element instanceof Element)) return;
    let path = [];
    let finished = false;
    while (!finished) {
      var selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
      } else {
        let sib = element;
        let nth = 1;
        while ((sib = sib.previousElementSibling) && nth++);
        selector += ':nth-child(' + nth + ')';
      }
      path.unshift(selector);
      if (element.parentElement === null) {
        finished = true;
      } else {
        element = element.parentElement;
      }
    }
    return path.join(' > ');
  }
  setCurrentRoot (element) {
    this.rootSelector = this.getSelector(element);
  }
  getCurrentRoot () {
    return jQuery(this.doc).find(this.rootSelector)[0];
  }
  getCurrentChildren () {
    return Array.from(this.getCurrentRoot().children);
  }
  fullScan (callback) {
    return new Promise((resolve, reject) => {
      let children = this.getCurrentChildren();
      callback({
        data: children,
        globalStartIndex: 0,
        globalEndIndex: children.length
      });
      resolve();
    });
  }
  getItems (indices) {
    return new Promise((resolve, reject) => {
      let items = [];
      this.getCurrentChildren().forEach(node => {
        let item = {};
        Array.from(node.attributes).forEach(a => {
          item[a.name] = a.value;
        });
        items.push(item);
      });
      resolve(items);
    });
  }
  numTotalItems () {
    return Promise.resolve(jQuery(this.doc).find(this.rootSelector)[0].children.length);
  }
  allProperties () {
    return new Promise((resolve, reject) => {
      let props = new Set();
      this.getCurrentChildren().forEach(node => {
        Array.from(node.attributes).forEach(a => {
          props.add(a.name);
        });
      });
      resolve(Array.from(props));
    });
  }
}

export default GraphicsModel;
