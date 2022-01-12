/* global document */
import {
  create,
  interpolate,
  quantize,
  interpolateRound,
  range,
  quantile,
  format,
  scaleLinear,
  scaleBand,
  axisBottom,
} from 'd3'

export function colorLegend({
  color,
  title,
  tickSize = 6,
  width = 320,
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  removeTicks = false,
  tickFormat,
  tickValues,
  // opacity,
  classNames,
  handleMouseover = a => a,
  handleMouseout = a => a,
  handleClick = a => a,
  cursorPointer = false,
} = {}) {
  const svg = create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('overflow', 'visible')
    // .style("opacity", 0.7)
    .style('display', 'block')
    .attr('class', classNames)

  let tickAdjust = g =>
    g.selectAll('.tick line').attr('y1', marginTop + marginBottom - height)
  let x

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length)

    x = color
      .copy()
      .rangeRound(quantize(interpolate(marginLeft, width - marginRight), n))

    svg
      .append('image')
      .attr('x', marginLeft)
      .attr('y', marginTop)
      .attr('width', width - marginLeft - marginRight)
      .attr('height', height - marginTop - marginBottom)
      .attr('preserveAspectRatio', 'none')
      .attr(
        'xlink:href',
        ramp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL(),
      )
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(
      color
        .copy()
        .interpolator(interpolateRound(marginLeft, width - marginRight)),
      {
        range() {
          return [marginLeft, width - marginRight]
        },
      },
    )

    svg
      .append('image')
      .attr('x', marginLeft)
      .attr('y', marginTop)
      .attr('width', width - marginLeft - marginRight)
      .attr('height', height - marginTop - marginBottom)
      .attr('preserveAspectRatio', 'none')
      .attr('xlink:href', ramp(color.interpolator()).toDataURL())

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1)
        tickValues = range(n).map(i => quantile(color.domain(), i / (n - 1)))
      }
      if (typeof tickFormat !== 'function') {
        tickFormat = format(tickFormat === undefined ? ',f' : tickFormat)
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds
      ? color.thresholds() // scaleQuantize
      : color.quantiles
      ? color.quantiles() // scaleQuantile
      : color.domain() // scaleThreshold

    const thresholdFormat =
      tickFormat === undefined
        ? d => d
        : typeof tickFormat === 'string'
        ? format(tickFormat)
        : tickFormat

    x = scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight])

    svg
      .append('g')
      .selectAll('rect')
      .data(color.range())
      .join('rect')
      .attr('x', (d, i) => x(i - 1))
      .attr('y', marginTop)
      .attr('width', (d, i) => x(i) - x(i - 1))
      .attr('height', height - marginTop - marginBottom)
      .attr('fill', d => d)

    tickValues = range(thresholds.length)
    tickFormat = i => thresholdFormat(thresholds[i], i)
  }

  // Ordinal
  else {
    x = scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight])

    svg
      .append('g')
      .selectAll('rect')
      .data(color.domain())
      .join('rect')
      .attr('style', `${cursorPointer ? 'cursor: pointer;' : ''}`)
      .attr('x', x)
      .attr('y', marginTop)
      .attr('width', Math.max(0, x.bandwidth() - 1))
      .attr('height', height - marginTop - marginBottom)
      .attr('fill', color)
      .on('mouseover', handleMouseover)
      .on('mouseout', handleMouseout)
      .on('click', handleClick)

    tickAdjust = () => {}
  }

  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(
      axisBottom(x)
        .ticks(ticks, typeof tickFormat === 'string' ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === 'function' ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues),
    )
    .call(tickAdjust)
    .call(g => g.select('.domain').remove())
    .call(g => (removeTicks ? g.selectAll('.tick').remove() : null))
    .call(g =>
      g
        .append('text')
        .attr('x', marginLeft)
        .attr('y', marginTop + marginBottom - height - 6)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .attr('class', 'font-sans')
        .attr('style', 'font-weight: 600;')
        .text(title),
    )

  return svg.node()
}

function ramp(color, n = 256) {
  var canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = 1
  const context = canvas.getContext('2d')
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1))
    context.fillRect(i, 0, 1, 1)
  }
  return canvas
}

export function swatches({
  color,
  columns = null,
  format = x => x,
  swatchSize = 15,
  swatchWidth = swatchSize,
  swatchHeight = swatchSize,
  marginLeft = 0,
  uid,
  customClass = '',
  circle = false,
}) {
  const id = uid
  //DOM.uid().id;

  if (columns !== null)
    return `<div
      style="display: flex; align-items: center; margin-left: ${+marginLeft}px; min-height: 33px; font: 10px sans-serif;"
    >
      <style>
        .${id}-item {
          break-inside: avoid;
          display: flex;
          align-items: center;
          padding-bottom: 1px;
        }

        .${id}-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: red;
          max-width: calc(100% - ${+swatchWidth}px - 0.5em);
        }

        .${id}-swatch {
          width: ${+swatchWidth}px;
          height: ${+swatchHeight}px;
          ${circle ? 'border-radius: 50%;' : ''}
          margin: 0 0.5em 0 0;
        }
      </style>
      <div style="width: 100%; columns: ${columns};">
        ${color.domain().map(value => {
          const label = format(value)
          return `<div class="${id}-item">
            <div class="${id}-swatch" style="background:${color(value)};"></div>
            <div class="${customClass} ${id}-label" title="${label.replace(
            /["&]/g,
            entity,
          )}">
              ${document.createTextNode(label)}
            </div>
          </div>`
        })}
      </div>
    </div>`

  return `<div
    style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;"
  >
    <style>
      .${id} {
        display: inline-flex;
        align-items: center;
        margin-right: 1em;
      }

      .${id}::before {
        content: "";
        width: ${+swatchWidth}px;
        height: ${+swatchHeight}px;
        ${circle ? 'border-radius: 50%;' : ''}
        margin-right: 0.5em;
        background: var(--color);
      }
    </style>
    <div>
      ${color
        .domain()
        .map(
          value =>
            `<span class="${customClass} ${id}" style="--color: ${color(value)}"
              >${format(value)}</span
            >`,
        )
        .join('')}
    </div>
  </div>`
}

function entity(character) {
  return `&#${character.charCodeAt(0).toString()};`
}
