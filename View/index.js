import missingIcon from '../img/missing.svg';

class View {
  constructor () {
    this.icon = missingIcon;
  }
  render (d3el) {
    d3el.text('Error! render() not implemented!');
  }
  get model () {
    if (!this.joinInterface) {
      return null;
    } else {
      return this.joinInterface.getModel(this);
    }
  }
  set model (model) {
    if (!this.joinInterface) {
      throw new Error('View has not been added to JoinInterface');
    } else {
      this.joinInterface.setModel(this, model);
    }
  }
}

export default View;
