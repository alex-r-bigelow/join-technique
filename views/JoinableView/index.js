import View from '../../lib/View';
import missingIcon from '../../img/missing.svg';

class JoinableView extends View {
  constructor () {
    super();
    // This is an abstract class; subclasses should override this.icon
    this.icon = missingIcon;
    this.visibleLocations = {};
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
      this.dirty = true;
    }
  }
}

export default JoinableView;
