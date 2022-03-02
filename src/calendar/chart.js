import { renderChart } from './render'
import { schemeRdYlGn, tsv } from 'd3'

const options = {
  aspectRatio: 1.5,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  bgColor: '#fafafa',

  /* Dimensions */
  /* xGridField */
  xGridGap: 0.1,
  /* yGridField */
  descending: true,
  /* yField */
  yFieldLabels: [
    'Extreme Drought',
    'Severe Drought',
    'Moderate Drought',
    'Average',
    'Moderately Moist',
    'Very Moist',
    'Extermely Moist',
  ],
  stackHeight: 0.6,
  // Has to in the same order and length as yFields / stackFields
  // colorScheme: d3.schemeBrBG[dimensions.yFields.length],
  colorScheme: schemeRdYlGn[7],

  /* uniqueColumnField */
  // Only used in tooltip, not for caclulating scales
  uniqueFieldTimeParser: '%Y%m',
  uniqueFieldTimeFormatter: '%b %Y',

  colorLegendHeight: 44,
  colorLegendWidth: 600,
}

const dimensions = {
  xGridField: 'year_in_decade',
  yGridField: 'decade',
  xField: 'month',
  // order: bottom to top; first value's rectangle will be on the bottom
  // the last value's rectangle will be on the top
  yFields: ['0', '1', '2', '3', '4', '5', '6'], // barFields? stackField
  nameField: 'year',
  uniqueColumnField: 'key', // identifies each column uniquely
}

const dataPath = 'data.tsv'

tsv(dataPath).then(data => {
  renderChart({
    data,
    dimensions,
    options,
    chartContainerSelector: '#chart-container',
  })
})
