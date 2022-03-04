import { tsv, schemePuOr, format } from 'd3'
import { renderChart } from './render'

const xAxisTickFormatter = val => {
  // if 65 na
  // greater than 60 >=60%
  // else simple format
  if (val === 0.65) {
    return 'N.A.'
  } else if (val >= 0.6) {
    return '≥60%'
  }

  return format('.0%')(val)
}

const options = {
  aspectRatioSplit: 0.9,
  aspectRatioCombined: 3.7,
  // compressX: 1.2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  // bgColor: '#fafafa',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  colorScheme: schemePuOr[6],

  xDomainCustom: [0, 0.6],
  xAxisLabel: 'Effective tax rate (2007-2012)',
  // xValuePrefix: '',
  xValueFormatter: '.0%',
  // xValueSuffix: '%',
  reduceXTickByFactor: 2,
  additionalXAxisTickValues: [0.65], // note faux tax rate for NA is 65
  xAxisTickFormatter,

  xOutsideDomainColor: 'gray',

  sizeRange: [0, 20],
  sizeValuePrefix: '',
  sizeValueFormatter: '$.3s',
  sizeValueSuffix: '',
  sizeLegendValues: [1e9, 10e9, 50e9, 250e9],
  sizeLegendTitle: 'Market capitalization',
  sizeLegendGapInCircles: 45,

  colorLegendTitle: 'Effective tax rate',

  combinedSegmentLabel: 'S&P 500 Companies',
  segmentType: 'Segment Type', // use this if it's the same for both split and combined modes
  segmentTypeCombined: '',
  segmentTypeSplit: '',
}

const dimensions = {
  sizeField: 'capitalization',
  xField: 'fauxTaxRate',
  xFieldForTooltip: 'Effective tax rate',
  extraFieldsForTooltip: ['taxes', 'earnings'],
  nameField: 'company',
  segmentField: 'sector',
}
const dataPath = 'simulationData.tsv'

tsv(dataPath).then(data => {
  renderChart({
    chartContainerSelector: '#chart-container',
    data,
    options,
    dimensions,
  })
})
