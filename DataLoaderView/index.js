import JoinableView from '../JoinableView';
import MainPage from './MainPage';
import template from './template.html';
import './style.scss';

import uploadIcon from '../img/upload.svg';

class DataLoaderView extends JoinableView {
  constructor () {
    super();
    this.icon = uploadIcon;
    this.page = new MainPage(this, null);
  }
  render (d3el) {
    if (!this.hasRenderedTo(d3el)) {
      this.d3el.html(template);
    }
    this.d3el.select('#status').text(() => {
      if (this.model) {
        return 'Loaded: ' + this.model.name;
      } else {
        return 'No data loaded';
      }
    });
    this.page.render(this.d3el.select('#pageContent'));
    this.d3el.select('#backButton')
      .style('display', this.page.prevPage === null ? 'none' : null)
      .on('click', () => { this.page.goBack(); });
    this.d3el.select('#continueButton')
      .style('display', this.page.showContinueButton ? null : 'none')
      .classed('disabled', !(this.page.canProceed))
      .on('click', () => { this.page.proceed(); });
  }
  setPage (page) {
    this.page = page;
    // let the page know that it needs to do a fresh render of the element
    this.page.d3el = null;
    // update the whole view
    this.render();
  }
  uploadFile () {
    console.log('something uploaded!');
  }
}

export default DataLoaderView;
