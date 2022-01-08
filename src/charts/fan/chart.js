/* global d3 */

const radiusField = 'distance (km)'
const angleField = 'price change (%)'
const nameField = 'Route'

// Options:
const coreChartWidth = 1000
const aspectRatio = 1
const marginBottom = 100
const marginLeft = 0
const marginRight = 100
const marginTop = 300

const chartContainerSelector = '#chart-container'

d3.csv('data.csv').then(rawData => {
  // console.log(rawData)
  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = d3.select(chartContainerSelector)

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const data = rawData.map(d => {
    const dataEl = {
      ...d,
      [radiusField]: parseFloat(d[radiusField]),
      [angleField]: parseFloat(d[angleField]),
    }
    return dataEl
  })

  const radiusScale = d3
    .scaleRadial()
    .domain([0, d3.max(data, d => d[radiusField])])
    .range([0, 400])

  // what value corresponds to what angle
  // 50 corresponds to pi/2 rad
  const angleScale = d3
    .scaleLinear()
    .domain([0, -50])
    .range([Math.PI / 2, Math.PI])

  chartCore
    .append('g')
    .selectAll('path')
    .data(data)
    .join('path')
    .attr('d', d => {
      return d3.lineRadial()([
        [0, 0],
        [angleScale(d[angleField]), radiusScale(d[radiusField])],
      ])
    })
    .attr('stroke', '#777')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.7)
    .attr('fill', 'none')
    .on('mouseover', (e, d) => {
      console.log(d[nameField])
    })

  // console.log(data)
})
