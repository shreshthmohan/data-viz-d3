/* global window */

// Chart based on https://observablehq.com/@d3/sankey by Mike Bostock
// Search algo used is based on https://observablehq.com/@iashishsingh/sankey-diagram-path-highlighting

import { select, scaleOrdinal, schemeCategory10, format } from 'd3'
import { uniq } from 'lodash-es'
import {
  sankey,
  sankeyCenter,
  sankeyLeft,
  sankeyJustify,
  sankeyRight,
  sankeyLinkHorizontal,
} from 'd3-sankey'
import { setupChartArea } from '../utils/setupChartArea'
import { initializeTooltip } from '../utils/initializeTooltip'
import { preventOverflow } from '../utils/preventOverflow'
import { setupSvgToPngDownloadButton } from '../utils/svgToPngDownload'

const alignOptions = {
  justify: sankeyJustify,
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
}

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    align = 'justify',

    verticalGapInNodes = 10,
    nodeWidth = 20,
    nodeLabelFontSize = 8,

    units = '',
    valueFormat = '',

    searchInputClassNames = '',
    // clearAllButtonClassNames = '',
  },
  dimensions: { sourceField, targetField, valueField },

  chartContainerSelector,
}) {
  const linkColorBy = {
    input: 'input',
    output: 'output',
    inputOutput: 'inputOutput',
    none: 'none',
  }

  const formatLinkThicknessValue = (val, unit) => {
    const formatter = format(valueFormat)
    return unit ? `${formatter(val)} ${unit}` : formatter(val)
  }

  const chosenAlign = alignOptions[align]

  // NOTE: Currently only 'inputOutput' is supported
  // Don't expose unless done
  const chosenLinkColor = linkColorBy.inputOutput

  applyInteractionStyles()

  const coreChartWidth = 1000
  const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
    setupChartArea({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    })

  setupSvgToPngDownloadButton({
    filename: 'sankey.png',
    svgNode: svg.node(),
    buttonParentSelection: select(chartContainerSelector),
  })

  const tooltipDiv = initializeTooltip()

  const { sankeyfied } = parseData({
    data,
    sourceField,
    targetField,
    valueField,
    chosenAlign,
    nodeWidth,
    verticalGapInNodes,
    coreChartWidth,
    coreChartHeight,
    units,
  })

  const colorScheme = scaleOrdinal(schemeCategory10)

  const colorScale = d =>
    colorScheme(d.category === undefined ? d.name : d.category)

  renderSankey({
    chartCore,
    sankeyfied,
    tooltipDiv,
    formatLinkThicknessValue,
    units,
    chosenLinkColor,
    linkColorBy,
    colorScale,
    coreChartWidth,
    nodeLabelFontSize,
  })

  const nodesSankey = []
  sankeyfied.nodes.forEach(thisNode => {
    const { name } = thisNode
    nodesSankey.push(name)
  })
  const handleSearch = searchEventHandler(sankeyfied)

  // const search =
  setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    chartContainerSelector,
    nodesSankey,
    svg,
  })

  // setupClearAllButton({
  //   widgetsLeft,
  //   clearAllButtonClassNames,
  //   search,
  //   handleSearch,
  //   svg,
  // })

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles() {
  select('body').append('style').html(`
    .sankey-nodes.hovering g:not(.active) * {
      opacity: 0.1;
    }
    .sankey-links.hovering g:not(.active) {
      opacity: 0.1;
    }
    
    .sankey-nodes.searching:not(.hovering) g:not(.node-matched) {
      opacity: 0.1;
    }
    .sankey-links.searching:not(.hovering) g:not(.node-matched) > path {
      opacity: 0.1;
    }`)
}

function parseData({
  data,
  sourceField,
  targetField,
  valueField,
  chosenAlign,
  nodeWidth,
  verticalGapInNodes,
  coreChartWidth,
  coreChartHeight,
  units,
}) {
  // Sankey data is a list of links (source, target and thickness value of each link)
  const links = data.map(d => ({
    source: d[sourceField],
    target: d[targetField],
    value: d[valueField],
  }))

  // Extract all unique nodes (sources and targets) from list of links
  const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))].map(
    name => ({
      name,
      category: name.replace(/ .*/, ''),
    }),
  )

  const sankeyGenerator = sankey()
    .nodeId(d => d.name)
    .nodeAlign(chosenAlign)
    .nodeWidth(nodeWidth)
    .nodePadding(verticalGapInNodes)
    // space taken up by sankey diagram
    .extent([
      [0, 0],
      [coreChartWidth, coreChartHeight],
    ])

  const sankeyfied = sankeyGenerator({
    nodes,
    links,
    units,
  })

  return { sankeyfied }
}

function getConnections(o, direction) {
  return o.source && o.target
    ? getConnectionsLink(o, direction)
    : getConnectionsNode(o, direction)
}

function getConnectionsLink(o, direction = 'both') {
  let connections = [o]

  if (direction === 'source' || direction === 'both') {
    connections = [...connections, ...getConnectionsNode(o.source, 'source')]
  }
  if (direction === 'target' || direction === 'both') {
    connections = [...connections, ...getConnectionsNode(o.target, 'target')]
  }

  return connections
}

function getConnectionsNode(o, direction = 'both') {
  let connections = [o]

  if (direction === 'source' || direction === 'both') {
    o.targetLinks.forEach(function (p) {
      connections = [...connections, ...getConnectionsLink(p, direction)]
    })
  }
  if (direction === 'target' || direction === 'both') {
    o.sourceLinks.forEach(function (p) {
      connections = [...connections, ...getConnectionsLink(p, direction)]
    })
  }

  return connections
}

function renderSankey({
  chartCore,
  sankeyfied,
  tooltipDiv,
  formatLinkThicknessValue,
  units,
  chosenLinkColor,
  linkColorBy,
  colorScale,
  coreChartWidth,
  nodeLabelFontSize,
}) {
  const link = chartCore
    .append('g')
    .attr('class', 'sankey-links')
    .attr('fill', 'none')
    .attr('stroke-opacity', 0.5)
    .selectAll('g')
    .data(sankeyfied.links)
    .join('g')
    .attr('class', 'sankey-link')
    .attr('id', d => `iv-link-${d.index}`)
    .style('mix-blend-mode', 'multiply')
    .on('mouseover', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      select('.sankey-nodes').classed('hovering', true)
      select('.sankey-links').classed('hovering', true)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          select(`#iv-link-${item.index}`).classed('active', true)
        } else {
          // else item is a node
          select(`#iv-node-${item.index}`).classed('active', true)
        }
      })

      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(
        `${thisNode.source.name} → ${
          thisNode.target.name
        }<br /><span class="font-bold">${formatLinkThicknessValue(
          thisNode.value,
          units,
        )}</span>`,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      select('.sankey-nodes').classed('hovering', false)
      select('.sankey-links').classed('hovering', false)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          select(`#iv-link-${item.index}`).classed('active', false)
        } else {
          // else item is a node
          select(`#iv-node-${item.index}`).classed('active', false)
        }
      })
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  if (chosenLinkColor === linkColorBy.inputOutput) {
    const gradient = link
      .append('linearGradient')
      .attr('id', d => `iv-link-gradient-${d.index}`)

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d => colorScale(d.source))

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d => colorScale(d.target))
  }

  link
    .append('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', d => {
      return `url(#iv-link-gradient-${d.index})`
    })
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('stroke-opacity', 0.5)

  const node = chartCore
    .append('g')
    // .attr("stroke", "#0004")
    .attr('class', 'sankey-nodes')
    .selectAll('g')
    .data(sankeyfied.nodes)
    .join('g')
    .attr('class', 'sankey-node')
    .attr('id', d => `iv-node-${d.index}`)

  node
    .append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => d.y1 - d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => colorScale(d))
    .on('mouseover', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      select('.sankey-nodes').classed('hovering', true)
      select('.sankey-links').classed('hovering', true)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          select(`#iv-link-${item.index}`).classed('active', true)
        } else {
          // else item is a node
          select(`#iv-node-${item.index}`).classed('active', true)
        }
      })

      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(
        `${
          thisNode.name
        }<br /><span class="font-bold">${formatLinkThicknessValue(
          thisNode.value,
          units,
        )}</span>`,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      select('.sankey-nodes').classed('hovering', false)
      select('.sankey-links').classed('hovering', false)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          select(`#iv-link-${item.index}`).classed('active', false)
        } else {
          // else item is a node
          select(`#iv-node-${item.index}`).classed('active', false)
        }
      })

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  node
    .append('text')
    .style('pointer-events', 'none')
    .text(d => d.name)
    .attr('font-family', 'sans-serif')
    .attr('font-size', nodeLabelFontSize)
    .attr('x', d => (d.x0 < coreChartWidth / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => (d.x0 < coreChartWidth / 2 ? 'start' : 'end'))
}

const searchEventHandler = sankeyfied => (qstr, svg) => {
  if (qstr) {
    // reset matched state for all links and nodes because
    // it we don't want matched states to accumulate as we type
    // the matched elements should only correspond to the current qstr
    svg.selectAll('.sankey-link').classed('node-matched', false)
    svg.selectAll('.sankey-node').classed('node-matched', false)

    const lqstr = qstr.toLowerCase()
    const sel = []
    sankeyfied.nodes.forEach(thisNode => {
      const { name } = thisNode
      if (name.toLowerCase().includes(lqstr)) {
        sel.push(thisNode)
      }
    })

    sel.forEach(function (o) {
      getConnections(o).forEach(function (p) {
        // Only push new elements if they don't already exist inside sel array
        if (
          !sel.find(el => {
            // check if link is already in sel array
            if (el.source && el.target && p.source && p.target) {
              return el.index === p.index
            }
            // check if node is already in sel array
            if (
              el.sourceLinks &&
              el.targetLinks &&
              p.sourceLinks &&
              p.targetLinks
            ) {
              return el.index === p.index
            }
            return false
          })
        ) {
          sel.push(p)
        }
      })
    })

    sel.forEach(item => {
      // if sel item is a link
      if (item.source && item.target) {
        svg.select(`#iv-link-${item.index}`).classed('node-matched', true)
      } else {
        // else item is a node
        svg.select(`#iv-node-${item.index}`).classed('node-matched', true)
      }
    })
    svg.select('.sankey-nodes').classed('searching', true)
    svg.select('.sankey-links').classed('searching', true)
  } else {
    sankeyfied.nodes.forEach(thisNode => {
      const { index } = thisNode
      svg.select(`#iv-node-${index}`).classed('node-matched', false)
    })
    svg.select('.sankey-nodes').classed('searching', false)
    svg.select('.sankey-links').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  svg,
  chartContainerSelector,
  nodesSankey,
}) {
  const enableSearchSuggestions = false

  enableSearchSuggestions &&
    widgetsLeft
      .append('datalist')
      .attr('role', 'datalist')
      // Assuming that chartContainerSelector will always start with #
      // i.e. it's always an id selector of the from #id-to-identify-search
      // TODO add validation
      .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
      .html(
        uniq(nodesSankey)
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)
  search.attr('placeholder', `Find by node`)

  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}

// function setupClearAllButton({
//   widgetsLeft,
//   clearAllButtonClassNames,
//   search,
//   handleSearch,
//   svg,
// }) {
//   const clearAll = widgetsLeft
//     .append('button')
//     .text('Clear Search')
//     .attr('class', clearAllButtonClassNames)
//   clearAll.classed('hidden', false)
//   clearAll.on('click', () => {
//     search.node().value = ''
//     handleSearch('', svg)
//   })
// }
