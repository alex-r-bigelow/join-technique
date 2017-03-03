/* globals DOMParser */

import jQuery from 'jquery';
import JoinableModel from '../JoinableModel';

class GraphicsModel extends JoinableModel {
  constructor (name, xmlText) {
    super(name);
    this.xmlText = xmlText;
    this.doc = new DOMParser().parseFromString(xmlText, 'image/svg+xml');
    this.rootSelector = 'svg';
  }
  getCurrentChildren () {
    return Array.from(jQuery(this.doc).find(this.rootSelector)[0].children);
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
