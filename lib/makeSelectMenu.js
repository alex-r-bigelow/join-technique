import * as d3 from './d3.min.js';

export default function (containerElement) {
  let d3el = d3.select(containerElement);

  // Attach properties to make the li or ol DOM element behave more like a
  // select element
  Object.defineProperty(containerElement, 'value', { get: function () {
    return d3el.select('.selected').attr('id');
  }});

  // Make the entries respond to clicks
  d3el.selectAll('li')
    .on('click', function () {
      let clickedItem = d3.select(this);
      let containerExpanded = d3el.classed('expanded');
      d3el.classed('expanded', !containerExpanded);
      if (containerExpanded) {
        // Just closed the menu; implement the change
        let oldValue = containerElement.value;
        d3el.selectAll('li').classed('selected', false);
        clickedItem.classed('selected', true);
        let newValue = containerElement.value;
        d3.select('body').selectAll('.selectMenuMask').remove();
        if (oldValue !== newValue) {
          containerElement.dispatchEvent(new window.Event('change'));
        }
      } else {
        // Stick a temporary top layer on everything outside the menu
        // that will close the menu if clicked
        let menuBBox = containerElement.getBoundingClientRect();
        let masks = d3.select('body').selectAll('.selectMenuMask')
          .data(['left', 'right', 'top', 'bottom']);
        masks = masks.enter()
          .append('div')
          .classed('selectMenuMask', true)
          .merge(masks);
        masks.style('position', 'absolute')
          .style('z-index', 10000000)
          .style('pointer-events', 'all')
          .style('left', d => d === 'right' ? menuBBox.right + 'px' : '0px')
          .style('top', d => d === 'bottom' ? menuBBox.bottom + 'px' : '0px')
          .style('width', d => d === 'left' ? menuBBox.left + 'px' : '100%')
          .style('height', d => d === 'top' ? menuBBox.top + 'px' : '100vh')
          .on('click', () => {
            d3el.classed('expanded', false);
            masks.remove();
          });
      }
    });
}
