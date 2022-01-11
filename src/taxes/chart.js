import { csv } from 'd3'
import { renderChart } from './render'

const options = {
  aspectRatioSplit: 2,
  aspectRatioCombined: 8,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  inbuiltScheme: 'schemeOrRd',
  numberOfColors: 5, // minumum: 3, maximum: 9

  collisionDistance: 0.5,

  xDomainCustom: [0, 45],
  xAxisLabel: 'x-axis label',
  xValuePrefix: '',
  xValueFormatter: '.1f',
  xValueSuffix: '%',

  sizeRange: [2, 15],
  sizeValuePrefix: '$',
  sizeValueFormatter: ',',
  sizeValueSuffix: '',
  sizeLegendValues: [10e3, 50e3, 10e4, 25e4],
  sizeLegendTitle: 'Size Legend Title',
  sizeLegendGapInCircles: 45,

  colorLegendTitle: 'Color Legend Label',

  combinedSegmentLabel: 'Combined Segment Label',
  segmentType: 'Segment Type', // use this if it's the same for both split and combined modes
  segmentTypeCombined: 'Segment Type (combined)',
  segmentTypeSplit: 'Segment Type (split)',

  splitButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  combinedButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
}

const dimensions = {
  sizeField: 'capitalization',
  xField: 'taxRate',
  nameField: 'name',
  segmentField: 'sector',
}
const dataPath = 'data.csv'

csv(dataPath).then(data => {
  renderChart({
    chartContainerSelector: '#chart-container',
    data,
    options,
    dimensions,
  })
})
