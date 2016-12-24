import View from '../View';
import missingIcon from '../img/missing.svg';

class JoinableView extends View {
  constructor () {
    super();
    this.icon = missingIcon;
  }
  get model () {
    if (!this.joinInterfaceView) {
      return null;
    } else {
      return this.joinInterfaceView.getModel(this);
    }
  }
  set model (model) {
    if (!this.joinInterfaceView) {
      throw new Error('JoinableView has not been added to JoinInterfaceView');
    } else {
      this.joinInterfaceView.setModel(this, model);
    }
  }
}

export default JoinableView;
