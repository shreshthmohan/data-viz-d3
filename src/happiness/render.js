/* global window */

import {
  select,
  max,
  scaleLinear,
  scaleLog,
  scaleSqrt,
  extent,
  axisBottom,
  axisRight,
  descending,
  lineRadial,
} from 'd3'
import { capitalize, uniq } from 'lodash-es'
import { formatNumber } from '../utils/formatters'

import { renderDirectionLegend } from './directionLegend'
import { preventOverflow } from '../utils/preventOverflow'
import { toClassText } from '../utils/toClassText'
import { pointsToRotationAngle, maceShape } from './helpers'

export function renderChart({
  data,
  dimensions: {
    xFieldStart,
    xFieldEnd,
    yFieldStart,
    yFieldEnd,
    sizeField,
    nameField,
  },

  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    oppositeDirectionColor = '#ee4e34',
    sameDirectionColor = '#44a8c1',

    yAxisTitle = `${yFieldStart} → ${yFieldEnd}`,
    xAxisTitle = `${xFieldStart} → ${xFieldEnd}`,

    xValueFormatter = '',
    yValueFormatter = '',

    directionStartLabel = 'start point',
    directionEndLabel = 'end point',
    sizeLegendValues = [1e6, 1e8, 1e9],
    sizeLegendMoveSizeObjectDownBy = 5,
    sizeLegendTitle = 'size legend title',
    sizeValueFormatter = '',

    xAxisTickValues = [],

    xScaleType = 'linear', // linear or log
    xScaleLogBase = 10, // applicable only if log scale

    defaultState = [],

    activeOpacity = 0.8, // click, hover, search
    inactiveOpacity = 0.2,

    circleSizeRange = [5, 30],
    lineWidthRange = [2, 4],

    searchInputClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',

    xFieldType = `${xFieldStart} → ${xFieldEnd}`,
    yFieldType = `${yFieldStart} → ${yFieldEnd}`,
  },
  chartContainerSelector,
}) {
  applyInteractionStyles({
    chartContainerSelector,
    activeOpacity,
    inactiveOpacity,
  })

  const coreChartWidth = 1000
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsRight,
    widgetsLeft,
  } = setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    aspectRatio,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  })

  const tooltipDiv = initializeTooltip()

  function fillAndShowTooltip({ shapeNode, dataObj }) {
    tooltipDiv.transition().duration(200).style('opacity', 1)
    const sizeFieldValue = formatNumber(dataObj[sizeField], sizeValueFormatter)
    const xFieldStartValue = formatNumber(dataObj[xFieldStart], xValueFormatter)
    const xFieldEndValue = formatNumber(dataObj[xFieldEnd], xValueFormatter)
    const yFieldStartValue = formatNumber(dataObj[yFieldStart], yValueFormatter)
    const yFieldEndValue = formatNumber(dataObj[yFieldEnd], yValueFormatter)
    tooltipDiv.html(`
        <div class="flex flex-col">
          <div class="font-bold">${dataObj[nameField]}</div>
          <div class="flex justify-between gap-1">
            <div>${xFieldType}</div>
            <div class="font-bold">${xFieldStartValue} → ${xFieldEndValue}</div>
          </div>
          <div class="flex justify-between gap-1">
            <div>${yFieldType}</div>
            <div class="font-bold">${yFieldStartValue} → ${yFieldEndValue}</div>
          </div>
          <div class="flex justify-between gap-1">
            <div>${capitalize(sizeField)}</div>
            <div class="font-bold">${sizeFieldValue}</div>
          </div>
        </div>`)

    const {
      x: shapeX,
      y: shapeY,
      width: shapeWidth,
      height: shapeHeight,
    } = shapeNode.getBoundingClientRect()
    tooltipDiv
      .style('left', `${shapeX + shapeWidth + window.scrollX}px`)
      .style('top', `${shapeY + window.scrollY + shapeHeight / 2}px`)
  }

  const dataParsed = parseData({
    data,
    xFieldStart,
    xFieldEnd,
    yFieldStart,
    yFieldEnd,
    sizeField,
  })

  const { yScale, xScale, circleSizeScale, lineWidthScale, colorScale } =
    setupScales({
      dataParsed,
      coreChartHeight,
      coreChartWidth,
      yFieldStart,
      yFieldEnd,
      xFieldStart,
      xFieldEnd,
      xScaleType,
      xScaleLogBase,
      sizeField,
      circleSizeRange,
      lineWidthRange,
      sameDirectionColor,
      oppositeDirectionColor,
      xAxisTickValues,
    })

  const nameValues = uniq(data.map(d => d[nameField]))

  const searchEventHandler = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase()
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const maceName = toClassText(val)
        if (val.toLowerCase().startsWith(lqstr)) {
          svg.select(`.mace-${maceName}`).classed('mace-matched', true)
        } else {
          svg.select(`.mace-${maceName}`).classed('mace-matched', false)
        }

        svg.select('.maces').classed('searching', true)
      })
      if (svg.selectAll('.mace-matched').size() === 1) {
        const matchedMace = svg.select('.mace-matched')
        // matchedMace.data()[0]
        fillAndShowTooltip({
          shapeNode: matchedMace.node(),
          dataObj: matchedMace.data()[0],
        })
      } else {
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0)
      }
    } else {
      referenceList.forEach(val => {
        const maceName = toClassText(val)
        svg.select(`.mace-${maceName}`).classed('mace-matched', false)
      })
      svg.select('.maces').classed('searching', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    }
  }

  const defaultStateAll = defaultState === 'All' ? nameValues : defaultState

  const gapInCircles = 30
  renderSizeLegend({
    gapInCircles,
    circleSizeScale,
    parentSelection: svg,
    sizeLegendMoveSizeObjectDownBy,
    sizeLegendValues,
    sizeValueFormatter,
    sizeLegendTitle,
    bgColor,
  })

  const stickHeight = 3
  const stickLength = 30
  const stickWidthLegend = 1
  const ballRadius = 6
  const gapForText = 5
  const singleMaceSectionHeight = 20

  renderColorLegend({
    stickHeight,
    stickLength,
    ballRadius,
    gapForText,
    singleMaceSectionHeight,
    widgetsLeft,
    sameDirectionColor,
    oppositeDirectionColor,
    svg,
  })

  renderDirectionLegend({
    selection: widgetsLeft.append('svg'),
    ballRadius,
    stickLength,
    stickWidthLegend,
    gapForText,
    directionStartLabel,
    directionEndLabel,
  })

  renderXAxis({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    xScale,
    xAxisTickValues,
    xAxisTitle,
  })

  // y-axis
  renderYAxis({ chartCore, coreChartWidth, yScale, yAxisTitle })

  // renderMaces

  chartCore
    .append('g')
    .attr('class', 'maces')
    .selectAll('path')
    .data(dataParsed)
    .join('path')
    .sort((a, b) => descending(a[sizeField], b[sizeField]))
    .attr(
      'class',
      d =>
        `mace
        ${d.slope >= 0 ? 'mace-same' : 'mace-opposite'}
        mace-${toClassText(d[nameField])}
        ${defaultStateAll.includes(d[nameField]) ? 'mace-active' : ''}`,
    )
    .attr('d', d => {
      const x1 = xScale(d[xFieldStart])
      const y1 = yScale(d[yFieldStart])
      const x2 = xScale(d[xFieldEnd])
      const y2 = yScale(d[yFieldEnd])
      const circleRadius = circleSizeScale(d[sizeField])
      const stickWidth = lineWidthScale(d[sizeField])
      const macePoints = maceShape({
        x1,
        y1,
        x2,
        y2,
        circleRadius,
        stickWidth,
      })
      return lineRadial()(macePoints)
    })
    .attr('transform', d => {
      const x1 = xScale(d[xFieldStart])
      const y1 = yScale(d[yFieldStart])
      const x2 = xScale(d[xFieldEnd])
      const y2 = yScale(d[yFieldEnd])
      const rotationAngle = pointsToRotationAngle({ x1, y1, x2, y2 })
      return `translate(${x2}, ${y2}) rotate(${rotationAngle})`
    })
    .attr('fill', d => colorScale(d.slope))
    .attr('stroke-linecap', 'square')
    .on('click', function () {
      const parentMace = select(this)
      const clickedState = parentMace.classed('mace-active')
      parentMace.classed('mace-active', !clickedState)
    })
    .on('mouseover', function (e, d) {
      select(this).classed('mace-hovered', true)

      fillAndShowTooltip({
        shapeNode: this,
        dataObj: d,
      })
    })
    .on('mouseout', function () {
      select(this).classed('mace-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  // searchEventHandler is a higher order function that returns a function based on referenceList (here nameValues)
  // handleSearch accepts search query string and applied appropriate
  const handleSearch = searchEventHandler(nameValues)
  const search = setupSearch({
    handleSearch,
    widgetsRight,
    searchInputClassNames,
    nameField,
    nameValues,
    svg,
    chartContainerSelector,
  })

  setupClearAllButton({
    widgetsRight,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })
  setupShowAllButton({
    widgetsRight,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({
  activeOpacity,
  inactiveOpacity,
  chartContainerSelector,
}) {
  select('body').append('style').html(`
    ${chartContainerSelector} .mace {
      cursor: pointer;
    }
    ${chartContainerSelector} g.maces .mace {
      fill-opacity: ${inactiveOpacity};
    }
    /* clicked and legend clicked states are common: controlled by .mace-active */
    ${chartContainerSelector} g.maces .mace.mace-active {
      fill-opacity: ${activeOpacity};
    }
    ${chartContainerSelector} g.maces.searching .mace.mace-matched {
      stroke: #333;
      stroke-width: 3;
    }
    /* So that legend text is visible irrespective of state */
    ${chartContainerSelector} g.mace text {
      fill-opacity: 0.8;
    }
    ${chartContainerSelector} g.maces .mace.mace-hovered {
      stroke: #333;
      stroke-width: 3;
    }
    ${chartContainerSelector} g.color-legend .mace-active {
      fill-opacity: ${activeOpacity};
    }
    ${chartContainerSelector} g.color-legend :not(.mace-active) {
      fill-opacity: ${inactiveOpacity};
    }
  `)
}

function setupChartArea({
  chartContainerSelector,
  coreChartWidth,
  aspectRatio,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  bgColor,
}) {
  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
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
    .attr(
      'style',
      'display: flex; flex-direction: column; align-items: start; gap: 10px;',
    )
  const widgetsRight = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: start; column-gap: 10px;')

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  return {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsRight,
    widgetsLeft,
  }
}

function initializeTooltip() {
  return select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border: 1px solid #777;',
    )
}

function parseData({
  data,
  xFieldStart,
  xFieldEnd,
  yFieldStart,
  yFieldEnd,
  sizeField,
}) {
  return data
    .map(el => {
      const elParsed = { ...el }
      elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart])
      elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd])
      elParsed[yFieldStart] = Number.parseFloat(el[yFieldStart])
      elParsed[yFieldEnd] = Number.parseFloat(el[yFieldEnd])
      elParsed[sizeField] = Number.parseFloat(el[sizeField])
      elParsed.slope =
        (elParsed[yFieldEnd] - elParsed[yFieldStart]) /
        (elParsed[xFieldEnd] - elParsed[xFieldStart])
      return elParsed
    })
    .filter(d => !Number.isNaN(d.slope))
}

function setupScales({
  dataParsed,
  coreChartHeight,
  coreChartWidth,
  yFieldStart,
  yFieldEnd,
  xFieldStart,
  xFieldEnd,
  xScaleType,
  xScaleLogBase,
  sizeField,
  circleSizeRange,
  lineWidthRange,
  sameDirectionColor,
  oppositeDirectionColor,
  xAxisTickValues,
}) {
  const yDomainStart = dataParsed.map(el => Number.parseFloat(el[yFieldStart]))
  const yDomainEnd = dataParsed.map(el => Number.parseFloat(el[yFieldEnd]))
  const yDomain = extent([...yDomainStart, ...yDomainEnd])
  const yScale = scaleLinear()
    .range([coreChartHeight, 0])
    .domain(yDomain)
    .nice()

  const xDomainStart = dataParsed.map(el => Number.parseFloat(el[xFieldStart]))
  const xDomainEnd = dataParsed.map(el => Number.parseFloat(el[xFieldEnd]))
  const xDomain = extent([...xDomainStart, ...xDomainEnd, ...xAxisTickValues])

  const xScale =
    xScaleType === 'log'
      ? scaleLog()
          .base(xScaleLogBase || 10)
          .range([0, coreChartWidth])
          .domain(xDomain)
      : scaleLinear().range([0, coreChartWidth]).domain(xDomain)

  const sizeMax = max(dataParsed.map(el => el[sizeField]))

  const circleSizeScale = scaleSqrt()
    .range(circleSizeRange)
    .domain([0, sizeMax])

  const lineWidthScale = scaleSqrt().range(lineWidthRange).domain([0, sizeMax])

  const colorScale = slope =>
    slope > 0 ? sameDirectionColor : oppositeDirectionColor

  return { yScale, xScale, circleSizeScale, lineWidthScale, colorScale }
}

function renderSizeLegend({
  gapInCircles,
  circleSizeScale,
  parentSelection,
  sizeLegendMoveSizeObjectDownBy,
  sizeLegendValues,
  sizeValueFormatter,
  sizeLegendTitle,
  bgColor,
}) {
  const sizeValues = sizeLegendValues.map(a => circleSizeScale(a))

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

  const sizeLegendContainerGroup = parentSelection
    .append('g')
    .attr('transform', 'translate(0, 10)')

  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${sizeLegendMoveSizeObjectDownBy})`)
    .selectAll('.g-size-circle')
    .data(sizeValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-circle')
    .append('circle')
    .attr('r', d => d)
    .style('fill', '#eee')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .attr('cx', (d, i) => cumulativeSizes[i] + i * gapInCircles + 1)
    .attr('cy', sizeValues[sizeValues.length - 1] + 1)

  sizeLegendContainerGroup
    .selectAll('.g-size-circle')
    .append('text')
    .attr('alignment-baseline', 'middle')
    .attr('dy', sizeValues[sizeValues.length - 1] + 2)
    .attr('dx', (d, i) => d + cumulativeSizes[i] + (i + 0.1) * gapInCircles)
    .style('font-size', 8)
    .text((d, i) => formatNumber(sizeLegendValues[i], sizeValueFormatter))

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendTitle)

  const { width, height } = sizeLegendContainerGroup.node().getBBox()

  sizeLegendContainerGroup
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('x', 0)
    .attr('y', 0)
    .attr('fill', bgColor)
    .lower()
}
function renderXAxis({
  chartCore,
  coreChartHeight,
  coreChartWidth,
  xScale,
  xAxisTickValues,
  xAxisTitle,
}) {
  const xAxis = chartCore
    .append('g')
    .attr('class', 'x-axis-bottom')
    .attr('transform', `translate(0, ${coreChartHeight + 30})`)
  xAxis.call(
    xAxisTickValues.length
      ? axisBottom(xScale).tickValues(xAxisTickValues)
      : axisBottom(xScale),
  )

  xAxis
    .append('g')
    .append('text')
    .attr('class', 'text-xs font-semibold tracking-wider')
    .text(xAxisTitle)
    .attr('fill', '#333')
    .attr('text-anchor', 'middle')
    .attr('transform', `translate(${coreChartWidth / 2}, 30)`)
}

function renderYAxis({ chartCore, coreChartWidth, yScale, yAxisTitle }) {
  const yAxis = chartCore
    .append('g')
    .attr('class', 'text-xs y-axis-right')
    .attr('transform', `translate(${coreChartWidth}, 0)`)
  yAxis
    .call(axisRight(yScale).ticks(5).tickSize(-coreChartWidth))
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
    .call(g => g.select('.domain').remove())

  yAxis
    .append('g')
    .append('text')
    .attr('class', 'font-semibold tracking-wider')
    .text(yAxisTitle)
    .attr('fill', '#333')
    .attr('text-anchor', 'end')
    .attr('transform', 'translate(8, -20)')
}

function renderColorLegend({
  stickHeight,
  stickLength,
  ballRadius,
  gapForText,
  singleMaceSectionHeight,
  widgetsLeft,
  sameDirectionColor,
  oppositeDirectionColor,
  svg,
}) {
  const colorLegend = widgetsLeft.append('svg')
  const colorLegendMain = colorLegend
    .append('g')
    .attr('class', 'color-legend cursor-pointer')
    .attr(
      'transform',
      `translate(0, ${-(singleMaceSectionHeight - ballRadius)})`,
    ) // 20-6
  const colorLegendSame = colorLegendMain
    .append('g')
    .attr('transform', `translate(0, ${singleMaceSectionHeight})`)
    .attr('fill', sameDirectionColor)
    .attr('class', 'mace mace-same')
    .on('click', e => {
      const parentLegend = select(e.target.parentNode)
      const legendState = parentLegend.classed('mace-active')
      svg.selectAll('.mace-same').classed('mace-active', !legendState)
      // Need this extra class toggle as legend is outside the main chart svg
      parentLegend.classed('mace-active', !legendState)
    })
  colorLegendSame
    .append('circle')
    .attr('cx', ballRadius + stickLength)
    .attr('r', ballRadius)
  colorLegendSame
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickHeight)
    .attr('y', -stickHeight / 2)
  colorLegendSame
    .append('text')
    .text('Moving in the same direction')
    .style('font-size', 10)
    .style('font-weight', 600)
    .attr(
      'transform',
      `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
    )
    .attr('alignment-baseline', 'middle')
  const colorLegendOpposite = colorLegendMain
    .append('g')
    .attr('transform', `translate(0, ${singleMaceSectionHeight * 2})`)
    .attr('fill', oppositeDirectionColor)
    .attr('class', 'mace mace-opposite')
    .on('click', e => {
      const parentLegend = select(e.target.parentNode)
      const legendState = parentLegend.classed('mace-active')
      svg.selectAll('.mace-opposite').classed('mace-active', !legendState)
      // Need this extra class toggle as legend is outside the main chart svg
      parentLegend.classed('mace-active', !legendState)
    })
  colorLegendOpposite
    .append('circle')
    .attr('cx', ballRadius + stickLength)
    .attr('r', ballRadius)
  colorLegendOpposite
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickHeight)
    .attr('y', -stickHeight / 2)
  colorLegendOpposite
    .append('text')
    .text('Moving in the opposite direction')
    .style('font-size', 10)
    .style('font-weight', 600)
    .attr(
      'transform',
      `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
    )
    .attr('alignment-baseline', 'middle')
  const legendBoundingBox = colorLegendMain.node().getBBox()
  colorLegend
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)
}

function setupSearch({
  handleSearch,
  widgetsRight,
  searchInputClassNames,
  nameField,
  svg,
  chartContainerSelector,
  nameValues,
}) {
  const enableSearchSuggestions = false

  enableSearchSuggestions &&
    widgetsRight
      .append('datalist')
      .attr('role', 'datalist')
      // Assuming that chartContainerSelector will always start with #
      // i.e. it's always an id selector of the from #id-to-identify-search
      // TODO add validation
      .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
      .html(
        uniq(nameValues)
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsRight
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)

  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)

  search.attr('placeholder', `Find by ${nameField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}

function setupClearAllButton({
  widgetsRight,
  clearAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const clearAll = widgetsRight
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    svg.selectAll('.mace').classed('mace-active', false)
    search.node().value = ''
    handleSearch('', svg)
  })
}

function setupShowAllButton({
  widgetsRight,
  showAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const showAll = widgetsRight
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  showAll.classed('hidden', false)
  showAll.on('click', () => {
    svg.selectAll('.mace').classed('mace-active', true)
    search.node().value = ''
    handleSearch('', svg)
  })
}
