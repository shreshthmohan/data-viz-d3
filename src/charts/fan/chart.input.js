/* global window */

import {
  format,
  select,
  min,
  max,
  descending,
  csv,
  extent,
  scaleLinear,
  lineRadial,
  axisLeft,
  axisTop,
  arc,
} from 'd3'

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

const radiusField = 'Distance'
const angleField = 'Price change'
const nameField = 'Route'

// Options:
const coreChartWidth = 1000
const aspectRatio = 2
const marginBottom = 0
const marginLeft = 0
const marginRight = 0
const marginTop = 0
const bgColor = 'transparent'

const angleValueFormat = ''
const radiusValueFormat = ','

const radiusAxisLabel = `${radiusField}, km`
const angleAxisLabel = 'Change in the price of economy-class ticket'

const chartContainerSelector = '#chart-container'

const angleValueFormatter = val => `${format(angleValueFormat)(val)}%`
const radiusValueFormatter = val => `${format(radiusValueFormat)(val)} km`

csv('data.csv').then(rawData => {
  // console.log(rawData)

  const callout = select('body')
    .append('div')
    .attr('class', 'dom-callout')
    .attr(
      'style',
      'opacity: 0; position: absolute; background-color: #ffffffc0; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )

  select('body').append('style').html(`
    
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

  const chartParent = select(chartContainerSelector)

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

  const radiusScale = scaleLinear()
    .range([0, min([coreChartHeight, coreChartWidth])])
    .domain([0, max(data, d => d[radiusField])])
    .nice()

  const angleScaleOld = scaleLinear()
    .domain([0, -50])
    .range([Math.PI / 2, Math.PI])

  const angleDomain = extent(data.map(d => d[angleField])).reverse()
  const angleScale = scaleLinear().domain(angleDomain).nice()

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
    .sort((a, b) => descending(a[radiusField], b[radiusField]))
    .on('mouseover', function (e, d) {
      // console.log(d[nameField])
      select(this).classed('hovered', true)
      select(this).select('rect').attr('opacity', 0.8)

      callout.html(`
        <div style="font-weight: 600;">${d[nameField]}</div>
        <div>${radiusField}: ${radiusValueFormatter(d[radiusField])}</div>
        <div>${angleField}: ${angleValueFormatter(d[angleField])}</div>
      `)

      callout
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
        .transition()
        .duration(200)
        .style('opacity', 1)
    })
    .on('mouseout', function () {
      select(this).classed('hovered', false)
      select(this).select('rect').attr('opacity', 0)

      callout
        .style('left', '-300px')
        .transition()
        .duration(200)
        .style('opacity', 0)
    })

  const transitionDuration = 1200

  dataLines
    .append('path')
    .transition()
    .duration(transitionDuration)
    .attr('d', d => {
      return lineRadial()([
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

  const enableTextLabels = false
  if (enableTextLabels) {
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
  }

  // y-axis
  lines
    .append('g')
    .attr(
      'transform',
      `rotate(${-180 + (angleScale.range()[1] * 180) / Math.PI})`,
    )
    .call(axisLeft(radiusScale).ticks(5).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g =>
      g
        .append('text')
        .text(radiusAxisLabel)
        .attr('fill', '#333')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('font-size', 12)
        .attr('dy', -35)
        .attr(
          'transform',
          `translate(0, ${radiusScale.range()[1] / 2}) rotate(-90)`,
        ),
    )

  const raidusTicksForTopAxis = radiusScale.ticks(5)
  const raidusTicksForTopAxisCount = raidusTicksForTopAxis.length

  lines
    .append('g')
    .attr(
      'transform',
      `rotate(${-90 + (angleScale.range()[0] * 180) / Math.PI})`,
    )
    .call(
      axisTop(radiusScale)
        .ticks(5)
        .tickValues(
          raidusTicksForTopAxis.slice(1, raidusTicksForTopAxisCount - 1),
        )
        .tickSize(0),
    )
    .call(g => g.select('.domain').remove())
    .call(g =>
      g
        .append('text')
        .text(radiusAxisLabel)
        .attr('fill', '#333')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('font-size', 12)
        .attr('dy', -20)
        .attr('transform', `translate(${radiusScale.range()[1] / 2}, 0) `),
    )

  const yGridLinesData = radiusScale.ticks()
  // console.log(yGridLinesData)

  const xGridLinesData = angleScale.ticks(5)

  // y-axis grid lines
  lines
    .append('g')
    .attr('class', 'y-axis-grid')
    .lower()
    .selectAll('path')
    .data(yGridLinesData)
    .join('path')
    .attr('d', d =>
      arc()({
        innerRadius: 0,
        outerRadius: radiusScale(d),
        startAngle: angleScale.range()[0],
        endAngle: angleScale.range()[1],
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
      return lineRadial()([
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
    .text(d => angleValueFormatter(d))
    .attr('alignment-baseline', 'middle')
    .attr('text-anchor', 'middle')

  // grid background - fan
  lines
    .append('path')
    .attr(
      'd',
      arc()({
        innerRadius: 0,
        outerRadius: radiusScale.range()[1],
        startAngle: angleScale.range()[0],
        endAngle: angleScale.range()[1],
      }),
    )
    .attr('fill', '#ebece7')
    .lower()

  // console.log('anglescale ticks', angleScale.ticks())
  lines
    .append('path')
    .attr('id', 'for-curved-x-label')
    .attr(
      'd',
      arc()({
        innerRadius: 40 + radiusScale.range()[1],
        outerRadius: 40 + radiusScale.range()[1],
        startAngle: angleScale.range()[0],
        endAngle: angleScale.range()[1],
      }),
    )
    .attr('fill', '#ebece7')

  lines
    .append('text')
    .append('textPath')
    .attr('xlink:href', '#for-curved-x-label')
    .style('text-anchor', 'middle')
    .attr('startOffset', '75%')
    .text(angleAxisLabel)
    .attr('font-size', '12')
    .attr('font-family', 'sans-serif')
    .style('font-weight', 'bold')

  preventOverflow({
    allComponents,
    svg,
    margins: { marginBottom, marginLeft, marginRight, marginTop },
  })
  // console.log(data)
})
