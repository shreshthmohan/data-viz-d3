import { csv } from 'd3'
import { renderChart } from './render'

const options = {
  aspectRatio: 1.8, // decrease this value to increase height

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  align: 'justify', // choose between: justify, left, right, center

  verticalGapInNodes: 10,
  nodeWidth: 20,
  nodeLabelFontSize: 11,

  units: 'TWh',
  valueFormat: ',.0f',
}

const dimensions = {
  sourceField: 'source',
  targetField: 'target',
  valueField: 'value', // determines thickness of the link
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
