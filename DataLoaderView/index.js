import View from '../View';
import template from './template.html';
import './style.scss';

import uploadIcon from '../img/upload.svg';

class DataLoaderView extends View {
  constructor () {
    super();
    this.icon = uploadIcon;
  }
  render (d3el) {
    if (!this.addedTemplate) {
      d3el.html(template);
      this.addedTemplate = true;

      d3el.select('#upload').on('change', this.changeUpload);
    }
    d3el.select('#status').text(() => {
      if (this.model) {
        return 'Loaded: ' + this.model.fileName;
      } else {
        return 'No data loaded';
      }
    });
    d3el.select('#statusSubtext').text(() => {
      if (this.model) {
        return 'Use something else:';
      } else {
        return 'Choose a dataset:';
      }
    });
  }
  changeUpload () {
    console.log('something uploaded!');
  }
}

export default DataLoaderView;
