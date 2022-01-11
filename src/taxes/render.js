/* global window */
import {
  select,
  scaleSqrt,
  extent,
  scaleLinear,
  scaleQuantize,
  scalePoint,
  axisTop,
  scaleBand,
  axisLeft,
  forceSimulation,
  forceManyBody,
  forceX,
  forceY,
  forceCollide,
  schemePuOr,
} from 'd3'
import { colorLegend } from '../utils/colorLegend'
import { preventOverflowThrottled } from '../utils/general'
import { formatNumber } from '../utils/formatters'

export function renderChart({
  data,
  dimensions: {
    sizeField,
    xField,
    nameField, // also search field
    segmentField,
    xFieldForTooltip = xField,
  },
  options: {
    aspectRatioCombined = 5,
    aspectRatioSplit = 0.8,
    compressX = 1,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    customColorScheme,

    colorScheme = schemePuOr[6],

    collisionDistance = 0.5,

    /* xField */
    xDomainCustom,
    xAxisLabel = xField,
    xValuePrefix = '',
    xValueFormatter = '',
    xValueSuffix = '',
    reduceXTickByFactor = 1,

    /* sizeField */
    sizeRange = [2, 20],
    sizeValuePrefix = '',
    sizeValueFormatter = '',
    sizeValueSuffix = '',
    sizeLegendValues,
    sizeLegendTitle = sizeField,
    sizeLegendGapInCircles = 30,

    colorLegendTitle = xField,
    colorLegendWidth = 260,

    combinedSegmentLabel = 'All',
    segmentType = segmentField,
    segmentTypeCombined = '',
    segmentTypeSplit = '',

    splitButtonClassNames = '',
    combinedButtonClassNames = '',
    searchInputClassNames = '',
  },

  chartContainerSelector,
}) {
  select('body').append('style').html(`
    .g-searching circle.c-match {
      stroke-width: 2;
      stroke: #333;
    }
    circle.c {
      stroke-width: 0.5;
      stroke: #000;
    }
    circle.c.hovered {
      stroke-width: 2;
      stroke: #333;
    }
  `)
  const coreChartWidth = 700

  const coreChartHeightCombined = coreChartWidth / aspectRatioCombined
  const coreChartHeightSplit = coreChartWidth / aspectRatioSplit

  const viewBoxHeightCombined =
    coreChartHeightCombined + marginTop + marginBottom
  const viewBoxHeightSplit = coreChartHeightSplit + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = select(chartContainerSelector)

  const widgets = chartParent
    .append('div')
    .attr(
      'style',
      'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
    )
  const widgetsLeft = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: end; column-gap: 5px;')

  const widgetsRight = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: center; column-gap: 10px;')

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const tooltipDiv = select('body')
    .append('div')
    .attr('class', `dom-tooltip absolute`)
    .attr('style', 'opacity: 0;')

  // Warning: trying to parameterize values like color or
  // border width in Tailwind will fail. Because of how JIT mode
  // scans files. It can't read through interpolation!
  // bg-${white} or border-[${6}px] won't work
  const tooltipChild = tooltipDiv.append('div').attr(
    'class',
    `
    bg-white border border-slate-500 rounded px-2 py-1 text-xs

    after:absolute after:border-[6px] after:border-transparent
    after:border-b-slate-500 after:-top-[calc(2*6px)]
    after:z-10 after:left-[calc(50%-6px)]

    before:absolute before:border-[5px] before:border-transparent
    before:left-[calc(50%-5px)] before:border-b-white 
    before:-top-[calc(2*5px)] before:z-20
   
    drop-shadow-md
    `,
  )

  const parsedData = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
  }))

  // const splitButton = select('#split-bubbles')
  const splitButton = widgetsLeft
    .append('button')
    .text('View by Industry')
    .attr('class', splitButtonClassNames)

  // const combinedButton = select('#combine-bubbles')
  const combinedButton = widgetsLeft
    .append('button')
    .text('Overall')
    .attr('class', combinedButtonClassNames)

  let allowSplit = false
  let allowCombine = false

  function manageSplitCombine() {
    if (!allowSplit) {
      splitButton.node().disabled = true
      splitButton.attr(
        'title',
        'Combined force simulation is either in progress or current configuration is already split',
      )
    } else {
      splitButton.node().disabled = false

      splitButton.attr('title', null)
    }

    if (!allowCombine) {
      combinedButton.node().disabled = true
      combinedButton.attr(
        'title',
        'Split force simulation is either in progress or current configuration is already combined',
      )
    } else {
      combinedButton.node().disabled = false
      combinedButton.attr('title', null)
    }
  }
  manageSplitCombine()

  const segments = [...new Set(parsedData.map(c => c[segmentField]))]
  const maxSizeValue = Math.max(...parsedData.map(c => c[sizeField]))

  const sizeRangeXCompressed = sizeRange.map(s => s * compressX)
  const sizeScale = scaleSqrt()
    .range(sizeRangeXCompressed)
    .domain([0, maxSizeValue])

  const yScale = scalePoint()
    .domain(segments)
    .range([0, coreChartHeightSplit])
    .padding(0.5)

  const xValues = parsedData.map(d => d[xField]).sort()
  const xDomainDefault = extent(xValues)
  const xDomain = xDomainCustom || xDomainDefault
  const xScale = scaleLinear().domain(xDomain).range([0, coreChartWidth])

  // TODO: separate field for color scale and xscale?
  // Right now both x scale and color scale are based on the same
  const xColorScale = scaleQuantize()
    .domain(xDomain)
    .range(customColorScheme || colorScheme)
    .nice()

  widgetsRight
    .append('svg')
    .attr('width', colorLegendWidth)
    .attr('height', 45)
    .append(() =>
      colorLegend({
        color: xColorScale,
        title: colorLegendTitle,
        width: colorLegendWidth,
        height: 48,
        tickFormat: xValueFormatter,
      }),
    )

  // Size Legend

  const sizeValues = sizeLegendValues.map(a => sizeScale(a))

  let cumulativeSize = 0
  const cumulativeSizes = []
  sizeValues.forEach((sz, i) => {
    if (i === 0) {
      cumulativeSize += sz
    } else {
      cumulativeSize += sizeValues[i - 1] + sizeValues[i]
    }

    cumulativeSizes.push(cumulativeSize)
  })

  const sizeLegend = widgetsRight.append('svg')
  const sizeLegendContainerGroup = sizeLegend.append('g')

  // TODO: move this to options?
  const moveSizeObjectDownBy = 5

  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${moveSizeObjectDownBy})`)
    .selectAll('.g-size-circle')
    .data(sizeValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-circle')
    .append('circle')
    .attr('r', d => d)
    .style('fill', '#bebebe')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .attr('cx', (d, i) => cumulativeSizes[i] + i * sizeLegendGapInCircles + 1)
    .attr('cy', sizeValues[sizeValues.length - 1] + 1)

  sizeLegendContainerGroup
    .selectAll('.g-size-circle')
    .append('text')
    .attr('alignment-baseline', 'middle')
    .attr('dy', sizeValues[sizeValues.length - 1] + 2)
    .attr(
      'dx',
      (d, i) => d + cumulativeSizes[i] + (i + 0.1) * sizeLegendGapInCircles,
    )
    .style('font-size', 8)
    .text(
      (d, i) =>
        sizeValuePrefix +
        formatNumber(sizeLegendValues[i], sizeValueFormatter) +
        sizeValueSuffix,
    )

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendTitle)

  const legendBoundingBox = sizeLegendContainerGroup.node().getBBox()
  sizeLegend
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)

  chartCore
    .append('g')
    .attr('transform', `translate(${coreChartWidth / 2}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs font-semibold')
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')

  const xAxis = chartCore.append('g').attr('id', 'x-axis')

  function renderXAxisSplit() {
    xAxis
      .call(
        axisTop(xScale)
          .tickSize(-coreChartHeightSplit)
          .tickFormat(
            val =>
              xValuePrefix + formatNumber(val, xValueFormatter) + xValueSuffix,
          )
          .ticks(xScale.ticks().length / reduceXTickByFactor),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }
  function renderXAxisCombined() {
    xAxis
      .call(
        axisTop(xScale)
          .tickSize(-coreChartHeightCombined)
          .tickFormat(
            val =>
              xValuePrefix + formatNumber(val, xValueFormatter) + xValueSuffix,
          ),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }

  const yAxisLabel = chartCore
    .append('g')
    .attr('transform', `translate(${-23}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs font-semibold ')
    .text(segmentType)
    .attr('text-anchor', 'end')

  function yAxisSplit() {
    select('#y-axis-combined').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-split')
      .call(axisLeft(yScale).tickSize(-coreChartWidth))
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line').attr('stroke-opacity', 0.1)
        g.selectAll('.tick text')
          .attr('transform', 'translate(-20,0)')
          .classed('text-xs font-bold', true)
      })
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1)
  }

  const yScaleCombined = scaleBand()
    .domain([combinedSegmentLabel])
    .range([0, coreChartHeightCombined])

  function yAxisCombined() {
    select('#y-axis-split').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-combined')
      .call(axisLeft(yScaleCombined).tickSize(-coreChartWidth))
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line').attr('stroke-opacity', 0.1)
        g.selectAll('.tick text')
          .attr('transform', 'translate(-20,0)')
          .classed('text-xs', true)
      })
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1)
  }

  const bubbles = chartCore.append('g').attr('class', 'bubbles')

  let allBubbles
  function ticked() {
    const u = bubbles.selectAll('circle').data(parsedData)
    allBubbles = u
      .enter()
      .append('circle')
      .attr('class', 'c')
      .attr('r', d => sizeScale(d[sizeField]))
      .style('fill', function (d) {
        return xColorScale(d[xField])
      })
      // .attr('stroke', function (d) {
      //   return rgb(xColorScale(d[xField])).darker(0.5)
      // })
      .merge(u)
      .attr('cx', function (d) {
        return d.x
      })
      .attr('cy', function (d) {
        return d.y
      })
      .on('mouseover', function (e, d) {
        tooltipChild.html(
          `<div><span>${d[nameField]}</span></div>
         <div class="flex">
           <div class="capitalize">${xFieldForTooltip}:</div>
           <div class="pl-1 font-bold">${
             xValuePrefix +
             formatNumber(d[xFieldForTooltip], xValueFormatter) +
             xValueSuffix
           }</div>
         </div>
         <div class="flex">
           <div class="capitalize">${sizeField}:</div>
           <div class="pl-1 font-bold" >${
             sizeValuePrefix +
             formatNumber(d[sizeField], sizeValueFormatter) +
             sizeValueSuffix
           }</div>
         </div>`,
        )
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + window.scrollY + 30}px`)
          .style('opacity', 1)

        select(this).classed('hovered', true)
      })
      .on('mouseout', function () {
        // tooltipDiv.style('opacity', 0)
        select(this).classed('hovered', false)
      })
    u.exit().remove()
    preventOverflowThrottled({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    })
  }

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)

  search.attr('placeholder', `Find a ${nameField}`)

  function searchBy(term) {
    if (term) {
      select('.bubbles').classed('g-searching', true)
      allBubbles.classed('c-match', d =>
        d[nameField].toLowerCase().includes(term.toLowerCase()),
      )
    } else {
      select('.bubbles').classed('g-searching', false)
    }
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })

  function splitSim() {
    allowSplit = false
    manageSplitCombine()
    renderXAxisSplit()

    yAxisSplit()

    yAxisLabel.text(segmentTypeSplit)

    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightSplit}`)

    bubbles.attr('transform', `translate(0, 0)`)
    bubbles.raise()

    forceSimulation(parsedData)
      .force('charge', forceManyBody().strength(1))
      .force(
        'x',

        forceX()
          .x(function (d) {
            return xScale(d[xField])
          })
          // split X strength
          .strength(1),
      )
      .force(
        'y',

        forceY()
          .y(function (d) {
            return yScale(d[segmentField])
          })
          // split Y strength
          .strength(1.2),
      )
      .force(
        'collision',
        forceCollide().radius(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        }),
      )
      .on('tick', ticked)
      .on('end', () => {
        window.console.log('split force simulation ended')
        allowCombine = true
        manageSplitCombine()
      })
  }
  function combinedSim() {
    allowCombine = false
    manageSplitCombine()
    renderXAxisCombined()

    yAxisCombined()

    yAxisLabel.text(segmentTypeCombined)
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)

    bubbles.attr('transform', `translate(0, ${coreChartHeightCombined / 2})`)
    bubbles.raise()

    forceSimulation(parsedData)
      .force('charge', forceManyBody().strength(1))
      .force(
        'x',

        forceX()
          .x(d => xScale(d[xField]))
          // combine X strength
          .strength(1),
      )
      .force(
        'y',
        forceY()
          .y(0)
          // combine Y strength
          .strength(0.3),
      )
      .force(
        'collision',
        forceCollide().radius(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        }),
      )
      .on('tick', ticked)
      .on('end', () => {
        window.console.log('combined force simulation ended')
        allowSplit = true
        manageSplitCombine()
      })
  }

  splitButton.on('click', splitSim)
  combinedButton.on('click', combinedSim)

  combinedSim()
}