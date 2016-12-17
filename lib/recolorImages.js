import * as d3 from './d3.min.js';

export default function (colorScheme) {
  let svg = d3.select('body').append('svg')
    .attr('width', 0)
    .attr('height', 0);
  svg.append('defs');

  // Collect all colors in use (may be referred to by multiple names)
  let allColors = {};
  Object.keys(colorScheme).forEach(colorName => {
    let color = colorScheme[colorName];
    if (!(color in allColors)) {
      allColors[color] = [];
    }
    allColors[color].push(colorName);
  });

  // Generate SVG filters that can recolor images to whatever
  // color we need. Styles simply do something like
  // filter: url(#recolorImageToFFFFFF)
  let recolorFilters = svg.select('defs').selectAll('filter.recolor')
    .data(Object.keys(allColors), d => d);
  let recolorFiltersEnter = recolorFilters.enter().append('filter')
    .attr('class', 'recolor')
    .attr('id', d => 'recolorImageTo' + d.slice(1));
  let cmpTransferEnter = recolorFiltersEnter.append('feComponentTransfer')
    .attr('in', 'SourceAlpha')
    .attr('result', 'color');
  cmpTransferEnter.append('feFuncR')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(1, 3);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
  cmpTransferEnter.append('feFuncG')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(3, 5);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
  cmpTransferEnter.append('feFuncB')
    .attr('type', 'linear')
    .attr('slope', 0)
    .attr('intercept', d => {
      let hexvalue = d.slice(5, 7);
      return Math.pow(parseInt(hexvalue, 16) / 255, 2);
    });
}
