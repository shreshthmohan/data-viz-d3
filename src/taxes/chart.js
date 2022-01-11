import { tsv, schemePuOr } from 'd3'
import { renderChart } from './render'
import { processCorporateTaxData } from './processCorporateTaxData'

const options = {
  aspectRatioSplit: 1.2,
  aspectRatioCombined: 3.7,
  // compressX: 1.2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  // bgColor: '#fafafa',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  colorScheme: schemePuOr[6],

  collisionDistance: 0.5,

  xDomainCustom: [0, 0.6],
  xAxisLabel: 'Effective tax rate (2007-2012)',
  // xValuePrefix: '',
  xValueFormatter: '.0%',
  // xValueSuffix: '%',
  reduceXTickByFactor: 2,

  sizeRange: [0, 20],
  sizeValuePrefix: '$',
  sizeValueFormatter: ',',
  sizeValueSuffix: '',
  sizeLegendValues: [10e3, 50e3, 10e4, 25e4],
  sizeLegendTitle: 'Size Legend Title',
  sizeLegendGapInCircles: 45,

  colorLegendTitle: 'Color Legend Label',

  combinedSegmentLabel: 'S&P 500 Companies',
  segmentType: 'Segment Type', // use this if it's the same for both split and combined modes
  segmentTypeCombined: '',
  segmentTypeSplit: '',

  splitButtonClassNames: `text-sm bg-gray-100 rounded-sm px-1.5 py-0.5 border border-gray-400
    hover:bg-gray-200 disabled:bg-gray-200 disabled:border-gray-400 disabled:text-gray-400
    disabled:cursor-not-allowed`,
  combinedButtonClassNames: `text-sm bg-gray-100 rounded-sm px-1.5 py-0.5 border border-gray-400
    hover:bg-gray-200 disabled:bg-gray-200 disabled:border-gray-400 disabled:text-gray-400
    disabled:cursor-not-allowed`,
  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-sm border border-gray-300 rounded-sm px-1.5 py-0.5 shadow-inner',
}

const dimensions = {
  sizeField: 'capitalization',
  xField: 'fauxTaxRate',
  xFieldForTooltip: 'Effective tax rate',
  nameField: 'company',
  segmentField: 'sector',
}
const dataPath = 'companies.tsv'

tsv(dataPath).then(rawData => {
  const data = processCorporateTaxData(rawData)

  renderChart({
    chartContainerSelector: '#chart-container',
    data,
    options,
    dimensions,
  })
})
