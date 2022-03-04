/* global window */
import { Delaunay } from 'd3-delaunay'
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
  schemePuOr,
  min,
  max,
} from 'd3'
import { preventOverflow } from '../utils/preventOverflow'
import { colorLegendThreshold } from '../utils/colorLegend'
import { formatNumber } from '../utils/formatters'

export function renderChart({
  data,
  dimensions: {
    sizeField,
    xField,
    nameField, // also search field
    segmentField,
    xFieldForTooltip = xField,
    extraFieldsForTooltip = [sizeField],
  },
  options: {
    aspectRatioCombined = 5,
    aspectRatioSplit = 0.8,
    compressX = 1,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    customColorScheme,

    colorScheme = schemePuOr[6],

    /* xField */
    xDomainCustom,
    xAxisLabel = xField,
    xValuePrefix = '',
    xValueFormatter = '',
    xValueSuffix = '',
    xAxisTickFormatter = val =>
      xValuePrefix + formatNumber(val, xValueFormatter) + xValueSuffix,
    additionalXAxisTickValues = [],
    // reduceXTickByFactor = 1,

    xOutsideDomainColor = '#ddd',

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
    .g-searching circle.c.c-match {
      stroke-opacity: 1;
    }
    .g-searching circle.c:not(.c-match) {
      fill-opacity: 0.2;
      stroke-opacity: 0.2;
    }
    circle.c {
      stroke-width: 1;
      stroke: #000;
      stroke-opacity: 0.5;
    }
    circle.c.hovered {
      stroke-opacity: 1;
    }
    #voronoi-container {
      fill: transparent;
      stroke: transparent;
    }
    .voronoi-visible #voronoi-container {
      fill: #21291f20;
      stroke: #7774;
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
      'display: flex; flex-wrap: wrap; justify-content: space-between; padding-bottom: 0.5rem;',
    )
  const widgetsLeft = widgets
    .append('div')
    .attr(
      'style',
      'display: flex; flex-wrap: wrap; align-items: end; column-gap: 5px;',
    )

  const widgetsRight = widgets
    .append('div')
    .attr(
      'style',
      'display: flex; flex-wrap: wrap; align-items: center; column-gap: 10px;',
    )

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('id', 'core-chart')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const tooltipDiv = select('body')
    .append('div')
    .attr('class', `dom-tooltip absolute`)
    .style('display', 'none')
    .style('pointer-events', 'none')

  // Warning: trying to parameterize values like color or
  // border width in Tailwind will fail. Because of how JIT mode
  // scans files. It can't read through interpolation!
  // bg-${white} or border-[${6}px] won't work
  const tooltipChild = tooltipDiv
    .append('div')
    .style('pointer-events', 'none')
    .attr(
      'class',
      `
    w-48 bg-white border-solid border border-slate-500 rounded px-2 py-1 text-xs

    after:absolute after:border-[6px] after:border-transparent
    after:border-t-slate-500 after:-bottom-[calc(2*6px)]
    after:z-10 after:left-[calc(50%-6px)]

    before:absolute before:border-[5px] before:border-transparent
    before:left-[calc(50%-5px)] before:border-t-white 
    before:-bottom-[calc(2*5px)] before:z-20
   
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
      splitButton.attr('title', 'The current configuration is already split')
    } else {
      splitButton.node().disabled = false

      splitButton.attr('title', null)
    }

    if (!allowCombine) {
      combinedButton.node().disabled = true
      combinedButton.attr(
        'title',
        'The current configuration is already combined',
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

  const xRange = extent([...xScale.domain(), ...additionalXAxisTickValues])
  const xMax = xRange[1]

  // TODO: separate field for color scale and xscale?
  // Right now both x scale and color scale are based on the same
  const xColorScale = scaleQuantize()
    .domain(xDomain)
    .range(customColorScheme || colorScheme)
    .nice()

  const colorLegendContainerGroup = allComponents.append('g')
  colorLegendThreshold({
    color: xColorScale,
    title: colorLegendTitle,
    width: colorLegendWidth,
    height: 48,
    tickFormat: xValueFormatter,
    selection: colorLegendContainerGroup,
  })

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

  const sizeLegendContainerGroup = allComponents
    .append('g')
    .attr('id', 'size-legend')

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

  chartCore
    .append('g')
    .attr('transform', `translate(${coreChartWidth / 2}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs font-semibold')
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')

  const xAxis = chartCore
    .append('g')
    .attr('id', 'x-axis')
    .style('pointer-events', 'none')

  function renderXAxisSplit() {
    xAxis
      .call(
        axisTop(xScale)
          .tickSize(-coreChartHeightSplit)
          .tickFormat(xAxisTickFormatter)
          .tickValues([...xScale.ticks(), ...additionalXAxisTickValues]),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }
  function renderXAxisCombined() {
    xAxis
      .call(
        axisTop(xScale)
          .tickSize(-coreChartHeightCombined)
          .tickFormat(xAxisTickFormatter)
          .tickValues([...xScale.ticks(), ...additionalXAxisTickValues]),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }

  const yAxisLabel = chartCore
    .append('g')
    .attr('transform', `translate(${-23}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs')
    .text(segmentType)
    .attr('text-anchor', 'end')

  function yAxisSplit() {
    select('#y-axis-combined').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-split')
      .style('pointer-events', 'none')
      .call(axisLeft(yScale).tickSize(-xScale(xMax)))
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

  const yScaleCombined = scaleBand()
    .domain([combinedSegmentLabel])
    .range([0, coreChartHeightCombined])

  function yAxisCombined() {
    select('#y-axis-split').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-combined')
      .style('pointer-events', 'none')
      // added xScale(xMax) to accomodate extra ticks (N/A tax rate in this case)
      .call(axisLeft(yScaleCombined).tickSize(-xScale(xMax)))
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

  const bubbles = chartCore
    .append('g')
    .attr('class', 'bubbles')
    .style('pointer-event', 'none')

  let allBubbles

  function splitSim() {
    allowSplit = false
    manageSplitCombine()
    renderXAxisSplit()

    yAxisSplit()

    yAxisLabel.text(segmentTypeSplit)

    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightSplit}`)

    // to render the circles above axes
    bubbles.raise()
    allBubbles = bubbles.selectAll('circle').data(parsedData)

    if (allBubbles.empty()) {
      // console.log('split sim empty')
      allBubbles
        .join('circle')
        .attr('class', 'c')
        .attr('id', (d, i) => `c-${i}`)
        .style('fill', function (d) {
          return d[xField] > max(xDomain) || d[xField] < min(xDomain)
            ? xOutsideDomainColor
            : xColorScale(d[xField])
        })
        .attr('cx', d => d.splitX)
        .attr('cy', d => d.splitY)
        .attr('r', 0)
        .transition()
        .duration(1000)
        .attr('r', d => sizeScale(d[sizeField]))
    } else {
      // console.log('split sim full')
      allBubbles
        .transition()
        .duration(1000)
        .attr('cx', d => d.splitX)
        .attr('cy', d => d.splitY)
    }

    chartCore.select('#voronoi-container').remove()
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    })

    function createVoronoiSplit() {
      const voronoiContainer = chartCore
        .append('g')
        .attr('id', 'voronoi-container')
        .style('pointer-events', 'all')

      const delaunay = Delaunay.from(
        parsedData,
        d => d.splitX,
        d => d.splitY,
      )

      // The array arg passed here is the bounds for Voronoi
      const voronoi = delaunay.voronoi([
        -sizeScale.range()[1], // xMin
        0, // yMin
        xScale(xMax) + sizeScale.range()[1], // xMax
        coreChartHeightSplit, // yMax
      ])

      voronoiContainer
        .append('defs')
        .selectAll('clipPath')
        .data(parsedData)
        .enter()
        .append('clipPath')
        .attr('id', (d, i) => `clip-${i}`)
        .append('circle')
        .attr('cx', d => d.splitX)
        .attr('cy', d => d.splitY)
        .attr('r', d => sizeScale(d[sizeField]) + 20)

      for (let i = 0; i < parsedData.length; i++) {
        voronoiContainer
          .append('path')
          .attr('id', `v-${i}`)
          .attr('d', voronoi.renderCell(i))
          .attr('clip-path', () => `url(#clip-${i})`)
          .on('mouseover', () => {
            const selectCircle = select(`#c-${i}`)
            const d = selectCircle.data()

            fillAndShowTooltip({
              shapeNode: selectCircle.node(),
              dataObj: d[0],
            })

            selectCircle.classed('hovered', true)
          })
          .on('mouseout', () => {
            tooltipDiv.style('display', 'none')
            select(`#c-${i}`).classed('hovered', false)
          })
      }
    }
    createVoronoiSplit()

    let runCount = 0
    let splitIntervalId = window.setInterval(() => {
      if (runCount > 11) {
        window.clearInterval(splitIntervalId)
        runCount = 0
        return
      }
      preventOverflow({
        allComponents,
        svg,
        margins: { marginLeft, marginRight, marginTop, marginBottom },
      })
      runCount++
    }, 100)

    allowCombine = true
    manageSplitCombine()
  }

  function combinedSim() {
    allowCombine = false
    manageSplitCombine()
    renderXAxisCombined()

    yAxisCombined()

    yAxisLabel.text(segmentTypeCombined)
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)

    // to render the circles above axes
    bubbles.raise()
    allBubbles = bubbles.selectAll('circle').data(parsedData)

    if (allBubbles.empty()) {
      // console.log('combined sim empty')
      allBubbles
        .join('circle')
        .attr('class', 'c')
        .attr('id', (d, i) => `c-${i}`)
        .transition()
        .duration(1000)
        .style('fill', function (d) {
          return d[xField] > max(xDomain) || d[xField] < min(xDomain)
            ? xOutsideDomainColor
            : xColorScale(d[xField])
        })
        .attr('cx', d => d.combinedX)
        .attr('cy', d => d.combinedY)
        .attr('r', d => sizeScale(d[sizeField]))
    } else {
      // console.log('combined sim full')
      allBubbles
        .transition()
        .duration(1000)
        .attr('cx', d => d.combinedX)
        .attr('cy', d => d.combinedY)
    }
    chartCore.select('#voronoi-container').remove()
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    })
    function createVoronoiCombined() {
      const voronoiContainer = chartCore
        .append('g')
        .attr('id', 'voronoi-container')
        .style('pointer-events', 'all')

      const delaunay = Delaunay.from(
        parsedData,
        d => d.combinedX,
        d => d.combinedY,
      )

      // The array arg passed here is the bounds for Voronoi
      const voronoi = delaunay.voronoi([
        -sizeScale.range()[1], // xMin
        0, // yMin
        xScale(xMax) + sizeScale.range()[1], // xMax
        coreChartHeightCombined, // yMax
      ])

      voronoiContainer
        .append('defs')
        .selectAll('clipPath')
        .data(parsedData)
        .enter()
        .append('clipPath')
        .attr('id', (d, i) => `clip-${i}`)
        .append('circle')
        .attr('cx', d => d.combinedX)
        .attr('cy', d => d.combinedY)
        .attr('r', d => sizeScale(d[sizeField]) + 20)

      for (let i = 0; i < parsedData.length; i++) {
        voronoiContainer
          .append('path')
          .attr('id', `v-${i}`)
          .attr('d', voronoi.renderCell(i))
          .attr('clip-path', () => `url(#clip-${i})`)
          .on('mouseover', () => {
            const selectCircle = select(`#c-${i}`)
            const d = selectCircle.data()

            fillAndShowTooltip({
              shapeNode: selectCircle.node(),
              dataObj: d[0],
            })

            selectCircle.classed('hovered', true)
          })
          .on('mouseout', () => {
            tooltipDiv.style('display', 'none')
            select(`#c-${i}`).classed('hovered', false)
          })
      }
    }
    createVoronoiCombined()

    let runCount = 0
    let combinedIntervalId = window.setInterval(() => {
      if (runCount > 11) {
        window.clearInterval(combinedIntervalId)
        runCount = 0
        return
      }
      preventOverflow({
        allComponents,
        svg,
        margins: { marginLeft, marginRight, marginTop, marginBottom },
      })
      runCount++
    }, 100)

    allowSplit = true
    manageSplitCombine()
  }

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)

  search.attr('placeholder', `Find a ${nameField}`)

  function searchBy(term) {
    if (term) {
      select('.bubbles').classed('g-searching', true)
      bubbles
        .selectAll('circle')
        .classed('c-match', d =>
          d[nameField].toLowerCase().startsWith(term.toLowerCase()),
        )
      if (chartCore.selectAll('.c-match').size() === 1) {
        const matchedCircle = chartCore.select('.c-match')

        fillAndShowTooltip({
          shapeNode: matchedCircle.node(),
          dataObj: matchedCircle.data()[0],
        })
      }
    } else {
      select('.bubbles').classed('g-searching', false)
      tooltipDiv.style('display', 'none')
    }
  }

  function fillAndShowTooltip({ shapeNode, dataObj }) {
    tooltipDiv.style('display', null)
    tooltipChild.html(
      `<div class="font-bold mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">${
        dataObj[nameField]
      }</div>
         <div class="flex justify-between mb-0.5">
           <div class="capitalize">${xFieldForTooltip}</div>
           <div class="pl-1 font-bold">${
             xValuePrefix +
             formatNumber(dataObj[xFieldForTooltip], xValueFormatter) +
             xValueSuffix
           }</div>
         </div>
         ${extraFieldsForTooltip
           .map(
             ef => `
         <div class="flex justify-between mb-0.5">
           <div class="capitalize">${ef}</div>
           <div class="pl-1 font-bold" >${
             sizeValuePrefix +
             formatNumber(dataObj[ef], sizeValueFormatter) +
             sizeValueSuffix
           }</div>
         </div>`,
           )
           .join('')}`,
    )
    const {
      x: circleX,
      y: circleY,
      width: circleWidth,
    } = shapeNode.getBoundingClientRect()
    const { width: tooltipWidth, height: tooltipHeight } = tooltipDiv
      .node()
      .getBoundingClientRect()

    tooltipDiv
      .style(
        'left',
        `${circleX - tooltipWidth / 2 + circleWidth / 2 + window.scrollX}px`,
      )
      .style('top', `${circleY - tooltipHeight - 6 - 1 + window.scrollY}px`)
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })

  splitButton.on('click', splitSim)
  combinedButton.on('click', combinedSim)

  // Voronoi visibility checkbox
  const voronoiVisbilityForm = widgetsRight
    .append('div')
    .attr('class', 'text-xs')

  voronoiVisbilityForm
    .append('input')
    .attr('id', 'show-voronoi')
    .attr('type', 'checkbox')
    .on('change', function (e) {
      chartCore.classed('voronoi-visible', e.target.checked)
    })

  voronoiVisbilityForm
    .append('label')
    .text('Show interaction Voronoi')
    .attr('for', 'show-voronoi')

  combinedSim()

  const {
    height: colorLegendContainerHeight,
    width: colorLegendContainerWidth,
    y: colorLegendContainerY,
    x: colorLegendContainerX,
  } = colorLegendContainerGroup.node().getBBox()

  const {
    height: sizeLegendHeight,
    width: sizeLegendWidth,
    y: sizeLegendY,
    x: sizeLegendX,
  } = sizeLegendContainerGroup.node().getBBox()

  const {
    x: chartCoreX,
    width: chartCoreWidth,
    y: chartCoreY,
  } = chartCore.node().getBBox()

  const legendHeight = max([sizeLegendHeight, colorLegendContainerHeight])

  sizeLegendContainerGroup.attr(
    'transform',
    `translate(${
      chartCoreX + chartCoreWidth - sizeLegendWidth - sizeLegendX
    }, ${chartCoreY - legendHeight - sizeLegendY})`,
  )

  const sizeLegendAndColorLegendGap = 10

  colorLegendContainerGroup.attr(
    'transform',
    `translate(${
      chartCoreX +
      chartCoreWidth -
      sizeLegendWidth -
      sizeLegendX -
      colorLegendContainerWidth +
      colorLegendContainerX -
      sizeLegendAndColorLegendGap
    }, ${chartCoreY - legendHeight - colorLegendContainerY})`,
  )
}
