class JoinableModel {
  constructor () {
    // This is an abstract class; we require that these methods be implemented:
    let requiredMethods = ['numTotalItems', 'allProperties', 'getItem'];
    requiredMethods.forEach(m => {
      if (this[m] === undefined) {
        throw new TypeError('Must override ' + m + ' method');
      }
    });
  }
}

export default JoinableModel;
