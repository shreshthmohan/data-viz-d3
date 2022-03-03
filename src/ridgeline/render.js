/* global window */
import {
  select,
  groups,
  timeParse,
  extent,
  scaleTime,
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  axisBottom,
  timeFormat,
  rgb,
  selectAll,
  schemeTableau10,
  area,
} from 'd3'
import { uniq, forEach } from 'lodash-es'
import { formatNumber } from '../utils/formatters'
import { preventOverflow } from '../utils/preventOverflow'
import { toClassText } from '../utils/toClassText'

function applyInteractionStyles({ activeOpacity, inactiveOpacity }) {
  select('body').append('style').html(`
  .series {
    cursor: pointer;
  }
g.serieses .series {
  fill-opacity: ${inactiveOpacity};
}
/* clicked and legend clicked states are common: controlled by .mace-active */
g.serieses .series.series-active {
  fill-opacity: ${activeOpacity};
}
g.serieses.searching .series.series-matched .top-line {
  fill-opacity: ${activeOpacity};
  stroke: #000;
  stroke-width: 3;
}
/* So that legend text is visible irrespective of state */
g.series text {
  fill-opacity: ${activeOpacity};
}
g.serieses g.series.series-matched text {
  font-weight: bolder;
}
g.serieses g.series.series-hovered .top-line {
  stroke-width: 3;
}
g.circles circle.circle {
  r: 2;
  fill-opacity: 0.1;
}
g.circles circle.circle.circle-hovered {
  r: 5;
  fill-opacity: ${activeOpacity};
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
    .attr('style', 'display: flex; align-items: end; column-gap: 5px;')
  const widgetsRight = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: center; column-gap: 10px;')

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
    widgetsLeft,
    widgetsRight,
    viewBoxWidth,
  }
}

function initializeTooltip() {
  return select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )
}

function parseData({ data, yField, xField, seriesField, colorField }) {
  const parsedData = data.map(d => ({
    ...d,
    [yField]: Number.parseFloat(d[yField]),
  }))

  parsedData.sort((a, b) => a[xField] - b[xField])

  const nestedData = groups(parsedData, d => d[seriesField]).map(
    ([key, values]) => ({
      [seriesField]: key,
      values,
      [colorField]: values[0][colorField],
    }),
  )

  return { parsedData, nestedData }
}

const parseDate = (dt, xAxisDateParser) => {
  const date = timeParse(xAxisDateParser)(dt)

  return date
}

function setupScales({
  parsedData,
  nestedData,
  xField,
  yField,
  seriesField,
  coreChartWidth,
  coreChartHeight,
  overlap,
  xAxisDateParser,
  colorField,
  colorRange,
}) {
  const xDomain = extent(
    uniq(parsedData.map(d => d[xField])).map(d =>
      parseDate(d, xAxisDateParser),
    ),
  )

  const xScale = scaleTime([0, coreChartWidth]).domain(xDomain)

  const categoryDomain = nestedData.map(d => d[seriesField])
  const categoryScale = scaleBand()
    .range([0, coreChartHeight])
    .domain(categoryDomain)
    .paddingInner(0)
    .paddingOuter(0)

  const yDomain = extent(parsedData, d => d[yField])
  const yScale = scaleLinear()
    .range([0, -(1 + overlap) * categoryScale.step()])
    .domain(yDomain)

  const colorDomain = uniq(parsedData.map(d => d[colorField]))
  const fillColorScale = scaleOrdinal().range(colorRange).domain(colorDomain)

  return { yScale, xScale, categoryScale, categoryDomain, fillColorScale }
}

function renderXAxis({
  chartCore,
  coreChartHeight,
  xScale,
  xAxisDateFormatter,
  xAxisTitle,
  coreChartWidth,
}) {
  const xAxis = chartCore
    .append('g')
    .attr('class', 'x-axis-bottom')
    .attr('transform', `translate(0, ${coreChartHeight + 10})`)

  xAxis.call(
    axisBottom(xScale).tickFormat(val => timeFormat(xAxisDateFormatter)(val)),
    // xAxisTickValues
    //   ? axisBottom(xScale).tickValues(xAxisTickValues)
    //   : axisBottom(xScale),
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

function renderRidges({
  chartCore,
  nestedData,
  seriesField,
  defaultStateAll,
  categoryScale,
  xField,
  yField,
  xAxisDateParser,
  xScale,
  yScale,
  fillColorScale,
  colorField,
  tooltipDiv,
  xTooltipFormatter,
  yValuePrefix,
  yValuePostfix,
  yValueFormatter,
  seriesLabelPosition,
  viewBoxWidth,
}) {
  const seriesGroup = chartCore
    .append('g')
    .attr('class', 'serieses')
    .selectAll('.series')
    .data(nestedData)
    .join('g')
    .attr('class', d => {
      return `series 
    series-${toClassText(d[seriesField])} 
    ${defaultStateAll.includes(d[seriesField]) ? 'series-active' : ''}`
    })
    .attr(
      'transform',
      d =>
        `translate(0, ${
          categoryScale(d[seriesField]) + categoryScale.bandwidth()
        })`,
    )
    .on('click', e => {
      const parentMace = select(e.target.parentNode)
      const clickedState = parentMace.classed('series-active')
      parentMace.classed('series-active', !clickedState)
    })
    .on('mouseover', e => {
      select(e.target.parentNode).classed('series-hovered', true)
    })
    .on('mouseout', e => {
      select(e.target.parentNode).classed('series-hovered', false)
    })

  const areaGen = area()
    // .curve(curveBasis)
    .x(d => xScale(parseDate(d[xField], xAxisDateParser)))
    .y1(d => yScale(d[yField]))
    .y0(yScale(0))

  seriesGroup
    .append('path')
    .attr('fill', d => {
      return rgb(fillColorScale(d[colorField])).brighter(0.2)
    })
    .datum(d => d.values)
    .attr('d', areaGen)
    .attr('stroke', d => {
      return rgb(fillColorScale(d[0][colorField])).darker(0.5)
    })

  seriesGroup
    .append('path')
    .attr('class', 'top-line')
    .attr('fill', 'none')
    .datum(d => d.values)
    .attr('d', areaGen.lineY1())
  // .attr('stroke', d => {
  //   return rgb(fillColorScale(d[0][colorField])).darker(0.5)
  // })

  seriesGroup
    .append('g')
    .attr('class', 'circles')
    .selectAll('.circle')
    .data(d => d.values)
    .join('circle')
    .attr('class', 'circle')
    .attr('cx', d => xScale(parseDate(d[xField], xAxisDateParser)))
    .attr('cy', d => yScale(d[yField]))
    .attr('fill', d => {
      return rgb(fillColorScale(d[colorField])).darker(1)
    })
    .on('mouseover', (e, d) => {
      select(e.target).classed('circle-hovered', true)
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(
        `${seriesField}: ${d[seriesField]} (${timeFormat(xTooltipFormatter)(
          timeParse(xAxisDateParser)(d[xField]),
        )})
      <br/>
      ${yField}: ${
          yValuePrefix +
          formatNumber(d[yField], yValueFormatter) +
          yValuePostfix
        }
      `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      select(e.target).classed('circle-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  seriesGroup
    .append('text')
    .text(d => d[seriesField])
    .attr('text-anchor', seriesLabelPosition === 'right' ? 'start' : 'end')
    .attr(
      'transform',
      `translate(${
        seriesLabelPosition === 'right' ? viewBoxWidth + 5 : -5
      }, 0)`,
    )
    .style('font-size', 10)
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = toClassText(qstr).toLowerCase()
    referenceList.forEach(val => {
      const seriesName = toClassText(val)
      if (seriesName.toLowerCase().includes(lqstr)) {
        select(`.series-${seriesName}`).classed('series-matched', true)
      } else {
        select(`.series-${seriesName}`).classed('series-matched', false)
      }
      select('.serieses').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const seriesName = toClassText(val)
      select(`.series-${seriesName}`).classed('series-matched', false)
    })
    select('.serieses').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  seriesField,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${seriesField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
}

function setupInitialStateButton({
  widgetsLeft,
  goToInitialStateButtonClassNames,
  defaultStateAll,
  search,
  handleSearch,
}) {
  const goToInitialState = widgetsLeft
    .append('button')
    .text('Go to Initial State')
    .attr('class', goToInitialStateButtonClassNames)
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    selectAll('.series').classed('series-active', false)
    forEach(defaultStateAll, val => {
      select(`.series-${toClassText(val)}`).classed('series-active', true)
    })
    search.node().value = ''
    handleSearch('')
  })
}

function setupClearAllButton({
  widgetsLeft,
  clearAllButtonClassNames,
  search,
  handleSearch,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    selectAll('.series').classed('series-active', false)
    search.node().value = ''
    handleSearch('')
  })
}

function setupShowAllButton({
  widgetsLeft,
  showAllButtonClassNames,
  search,
  handleSearch,
}) {
  const showAll = widgetsLeft
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  showAll.classed('hidden', false)
  showAll.on('click', () => {
    selectAll('.series').classed('series-active', true)
    search.node().value = ''
    handleSearch('')
  })
}

export function renderChart({
  data,
  options: {
    aspectRatio = 0.8,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = '#eee',

    xAxisTitle = '',
    xAxisDateParser = '',
    xAxisDateFormatter = '',
    xTooltipFormatter = '%B %d, %Y',

    overlap = 1,
    yValueFormatter = '',
    yValuePrefix = '',
    yValuePostfix = '',

    seriesLabelPosition = 'left',

    colorRange = schemeTableau10,

    defaultState = [],

    activeOpacity = 0.8,
    inactiveOpacity = 0.2,

    searchInputClassNames = '',
    goToInitialStateButtonClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',
  },
  dimensions: { seriesField, xField, yField, colorField },
  chartContainerSelector,
}) {
  applyInteractionStyles({ activeOpacity, inactiveOpacity })

  const coreChartWidth = 1000
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    viewBoxWidth,
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

  const { parsedData, nestedData } = parseData({
    data,
    yField,
    xField,
    seriesField,
    colorField,
  })

  const { yScale, xScale, categoryScale, categoryDomain, fillColorScale } =
    setupScales({
      parsedData,
      nestedData,
      xField,
      yField,
      seriesField,
      coreChartWidth,
      coreChartHeight,
      overlap,
      xAxisDateParser,
      colorField,
      colorRange,
    })

  const defaultStateAll = defaultState === 'All' ? categoryDomain : defaultState

  renderXAxis({
    chartCore,
    coreChartHeight,
    xScale,
    xAxisDateFormatter,
    xAxisTitle,
    coreChartWidth,
  })

  renderRidges({
    chartCore,
    nestedData,
    seriesField,
    defaultStateAll,
    categoryScale,
    xField,
    yField,
    xAxisDateParser,
    xScale,
    yScale,
    fillColorScale,
    colorField,
    tooltipDiv,
    xTooltipFormatter,
    yValuePrefix,
    yValuePostfix,
    yValueFormatter,
    seriesLabelPosition,
    viewBoxWidth,
  })

  const handleSearch = searchEventHandler(categoryDomain)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    seriesField,
  })

  setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
  })

  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
  })

  setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
  })

  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
