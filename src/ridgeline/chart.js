import { csv, schemeTableau10 } from 'd3'
import { renderChart } from './render'

const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // background-color

  /* xField */
  xAxisTitle: 'Date',
  xAxisDateParser: '%y%m%d',
  xAxisDateFormatter: '%b-%y',
  xTooltipFormatter: '%B %d, %Y',

  /* yField */
  overlap: 7,
  yValueFormatter: '.1f',
  yValuePrefix: '',
  yValuePostfix: 'M',

  /* seriesField */
  seriesLabelPosition: 'left', // ['left', 'right']

  /* colorField */
  colorRange: schemeTableau10,
  // colorRange: ['red', 'green', 'blue', 'black', 'yellow'],
  // colorRange: d3.schemeSpectral[7],
  // colorRange: d3.schemeRdYlGn[5],
  // colorRange: grv.schemeAccentLightBlue,

  /* Initial State */
  // 'All' to make all maces actives
  defaultState: [
    'Narendra Modi, India',
    'North Korea',
    'Prince Harry & Meghan Markle',
  ],
  // defaultState: 'All',

  /* Interactions */
  activeOpacity: 0.9,
  inactiveOpacity: 0.1,
}

const dimensions = {
  xField: 'date', // Date
  yField: 'Readers', // Numeric
  seriesField: 'Topic', // Categorical
  colorField: 'group', // Categorical
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
