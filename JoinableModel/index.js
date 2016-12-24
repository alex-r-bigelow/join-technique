class JoinableModel {
  constructor () {
    // This is an abstract class; we require that these methods be implemented:
    let requiredMethods = ['numItems', 'allProperties'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError('Must override ' + m + ' method');
      }
    });
  }
}

export default JoinableModel;
