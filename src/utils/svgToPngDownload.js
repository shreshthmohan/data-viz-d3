/* global document */

import { Canvg } from 'canvg'
import { select } from 'd3'

export function setupSvgToPngDownloadButton({
  buttonText = 'Download image',
  filename = 'image.png',
  svgNode,
  buttonParentSelection,
}) {
  buttonParentSelection
    .append('button')
    .text(buttonText)
    .on('click', downloadImage)

  function downloadImage() {
    const { width, height } = svgNode.getBoundingClientRect()

    const canvas = select('body')
      .append('canvas')
      .attr('width', width)
      .attr('height', height)
      .node()
    const ctx = canvas.getContext('2d')
    const svgo = svgNode.outerHTML
    const v = Canvg.fromString(ctx, svgo)

    //  // Start SVG rendering with animations and mouse handling.
    v.start()

    var link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
}
