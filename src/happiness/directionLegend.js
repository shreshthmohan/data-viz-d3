export function renderDirectionLegend({
  selection,
  circleRadius = 5,
  stickLength = 30,
  stickWidth = 2,
  directionStartLabel = 'start',
  directionEndLabel = 'end',
  gapForText = 5,
}) {
  const directionLegend = selection
  const directionLegendMain = directionLegend.append('g')
  const directionLegendChild = directionLegendMain
    .append('g')
    .attr('fill', 'gray')
  directionLegendChild
    .append('circle')
    .attr('cx', circleRadius + stickLength)
    .attr('r', circleRadius)
  directionLegendChild
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickWidth)
    .attr('y', -stickWidth / 2)
  const startPointText = directionLegendChild
    .append('text')
    .text(directionStartLabel)
    .attr('alignment-baseline', 'middle')
    .attr('text-anchor', 'end')
    .style('font-size', 10)
    .attr('transform', `translate(${-gapForText}, 0)`)

  directionLegendChild.attr(
    'transform',
    `translate(${startPointText.node().getBBox().width + gapForText}, ${
      circleRadius > startPointText.node().getBBox().height / 2
        ? circleRadius
        : startPointText.node().getBBox().height / 2
    })`,
  )

  directionLegendChild
    .append('text')
    .text(directionEndLabel)
    .attr('alignment-baseline', 'middle')
    .attr('text-anchor', 'start')
    .attr(
      'transform',
      `translate(${stickLength + circleRadius * 2 + gapForText}, 0)`,
    )
    .style('font-size', 10)

  const directionLegendBoundingBox = directionLegendMain.node().getBBox()
  directionLegend
    .attr('height', directionLegendBoundingBox.height)
    .attr('width', directionLegendBoundingBox.width)
}
