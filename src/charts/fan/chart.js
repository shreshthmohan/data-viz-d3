/* global d3 */

function preventOverflow({ allComponents, svg, safetyMargin = 5, margins }) {
  const { marginLeft, marginRight, marginTop, marginBottom } = margins
  let allComponentsBox = allComponents.node().getBBox()

  const updatedViewBoxWidth =
    allComponentsBox.width + safetyMargin + marginLeft + marginRight
  const updatedViewBoxHeight =
    allComponentsBox.height + safetyMargin + marginTop + marginBottom
  svg.attr('viewBox', `0 0 ${updatedViewBoxWidth} ${updatedViewBoxHeight}`)

  allComponentsBox = allComponents.node().getBBox()

  allComponents.attr(
    'transform',
    `translate(${-allComponentsBox.x + safetyMargin / 2 + marginLeft}, ${
      -allComponentsBox.y + safetyMargin / 2 + marginTop
    })`,
  )
}

const radiusField = 'distance (km)'
const angleField = 'price change (%)'
const nameField = 'Route'

// Options:
const coreChartWidth = 800
const aspectRatio = 2
const marginBottom = 0
const marginLeft = 0
const marginRight = 0
const marginTop = 0
const bgColor = 'transparent'

const chartContainerSelector = '#chart-container'

d3.csv('data.csv').then(rawData => {
  // console.log(rawData)

  const callout = d3
    .select('body')
    .append('div')
    .attr('class', 'dom-callout')
    .attr(
      'style',
      'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )

  d3.select('body').append('style').html(`
    
    .mallet {
      stroke: '#266fa0';
    }
    .mallet.hovered {
      stroke: orange;
      
    }
    .mallet.hovered text {
      fill: #000;
    }
    `)

  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = d3.select(chartContainerSelector)

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

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
    .scaleLinear()
    .range([0, d3.min([coreChartHeight, coreChartWidth])])
    .domain([0, d3.max(data, d => d[radiusField])])
    .nice()

  const angleScaleOld = d3
    .scaleLinear()
    .domain([0, -50])
    .range([Math.PI / 2, Math.PI])

  const angleDomain = d3.extent(data.map(d => d[angleField])).reverse()
  const angleScale = d3.scaleLinear().domain(angleDomain).nice()

  const angleRange = [
    angleScaleOld(angleScale.domain()[0]),
    angleScaleOld(angleScale.domain()[1]),
  ]
  angleScale.range(angleRange)

  // console.log('angleDomain:', angleDomain)
  // console.log('angleScale.domain:', angleScale.domain())

  const lines = chartCore
    .append('g')
    .attr(
      'transform',
      `translate(${coreChartWidth / 2 - radiusScale.range()[1] / 2}, 0)`,
    )

  // Data Lines
  const dataLines = lines
    .selectAll('g')
    .data(data)
    .join('g')
    .attr('class', 'mallet')
    .attr('fill', 'white')
    .attr('stroke', '#266fa0')
    .sort((a, b) => d3.descending(a[radiusField], b[radiusField]))
    .on('mouseover', function (e, d) {
      // console.log(d[nameField])
      d3.select(this).classed('hovered', true)
      d3.select(this).select('rect').attr('opacity', 0.8)
    })
    .on('mouseout', function (e, d) {
      d3.select(this).classed('hovered', false)
      d3.select(this).select('rect').attr('opacity', 0)
    })

  const transitionDuration = 1200

  dataLines
    .append('path')
    .transition()
    .duration(transitionDuration)
    .attr('d', d => {
      return d3.lineRadial()([
        [0, 0],
        [angleScale(d[angleField]), radiusScale(d[radiusField])],
      ])
    })
    .attr('stroke-width', 2)
    // .attr('opacity', 0.7)
    .attr('fill', 'none')

  dataLines
    .append('circle')
    .transition()
    .duration(transitionDuration)
    .attr('cx', d => {
      return (
        radiusScale(d[radiusField]) *
        Math.cos(angleScale(d[angleField]) - Math.PI / 2)
      )
    })
    .attr('cy', d => {
      return (
        radiusScale(d[radiusField]) *
        Math.sin(angleScale(d[angleField]) - Math.PI / 2)
      )
    })
    .attr('r', 4)
    .attr('stroke-width', 2)

  dataLines
    .append('rect')
    .attr('x', d => {
      return (
        5 +
        radiusScale(d[radiusField]) *
          Math.cos(angleScale(d[angleField]) - Math.PI / 2)
      )
    })
    .attr('y', d => {
      return (
        radiusScale(d[radiusField]) *
          Math.sin(angleScale(d[angleField]) - Math.PI / 2) -
        6
      )
    })
    .attr('width', 70)
    .attr('height', 12)
    .attr('opacity', 0)
    .attr('stroke-width', 0)

  dataLines
    .append('text')
    .attr('opacity', 0)
    .transition()
    .duration(transitionDuration)
    .attr('dx', d => {
      return (
        7 +
        radiusScale(d[radiusField]) *
          Math.cos(angleScale(d[angleField]) - Math.PI / 2)
      )
    })
    .attr('dy', d => {
      return (
        radiusScale(d[radiusField]) *
        Math.sin(angleScale(d[angleField]) - Math.PI / 2)
      )
    })
    .attr('opacity', 1)
    .attr('fill', '#777')
    .attr('stroke', 'none')
    .text(d => d[nameField])
    .attr('font-size', '9')
    .attr('font-family', 'sans-serif')
    // .attr('font-weight', 'bold')
    .attr('alignment-baseline', 'middle')
    .call(d => console.log('each', d))

  // y-axis
  lines
    .append('g')
    .call(d3.axisLeft(radiusScale).ticks(5).tickSize(0))
    .call(g => g.select('.domain').remove())
    .attr(
      'transform',
      `rotate(${-180 + (angleScale.range()[1] * 180) / Math.PI})`,
    )

  const yGridLinesData = radiusScale.ticks()
  // console.log(yGridLinesData)

  const xGridLinesData = angleScale.ticks()
  const [firstXGridLine, lastXGridLine] = d3.extent(xGridLinesData)
  // console.log(firstXGridLine, lastXGridLine)
  // console.log(xGridLinesData)

  // y-axis grid lines
  lines
    .append('g')
    .attr('class', 'y-axis-grid')
    .lower()
    .selectAll('path')
    .data(yGridLinesData)
    .join('path')
    .attr('d', d =>
      d3.arc()({
        innerRadius: 0,
        outerRadius: radiusScale(d),
        startAngle: angleScale(firstXGridLine),
        endAngle: angleScale(lastXGridLine),
      }),
    )
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-width', 2)

  // x-axis grid lines
  lines
    .append('g')
    .lower()
    .selectAll('path')
    .data(xGridLinesData)
    .join('path')
    .attr('d', d => {
      return d3.lineRadial()([
        [0, 0],
        [angleScale(d), radiusScale.range()[1]],
      ])
    })
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .attr('fill', 'none')

  // x-axis tick labels
  lines
    .append('g')
    .attr('font-size', '10')
    .attr('font-family', 'sans-serif')
    .selectAll('text')
    .data(xGridLinesData)
    .join('text')
    .attr('dx', d => {
      return (
        (radiusScale.range()[1] + 10) * Math.cos(angleScale(d) - Math.PI / 2)
      )
    })
    .attr('dy', d => {
      return (
        (radiusScale.range()[1] + 10) * Math.sin(angleScale(d) - Math.PI / 2)
      )
    })
    .text(d => d)
    .attr('alignment-baseline', 'middle')
    .attr('text-anchor', 'middle')

  // grid background - fan
  lines
    .append('path')
    .attr(
      'd',
      d3.arc()({
        innerRadius: 0,
        outerRadius: radiusScale.range()[1],
        startAngle: angleScale.range()[0],
        endAngle: angleScale.range()[1],
      }),
    )
    .attr('fill', '#ebece7')
    .lower()

  // console.log('anglescale ticks', angleScale.ticks())

  preventOverflow({
    allComponents,
    svg,
    margins: { marginBottom, marginLeft, marginRight, marginTop },
  })
  // console.log(data)
})
