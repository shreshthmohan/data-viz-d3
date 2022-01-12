import { throttle } from 'lodash-es'

export function toClassText(str) {
  return str
    .trim()
    .replace(/[\s&',.()]/g, '-')
    .toLowerCase()
}

export function preventOverflow({
  allComponents,
  svg,
  safetyMargin = 5,
  margins,
}) {
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

// Throttled this function for use in force simulations
export const preventOverflowThrottled = throttle(preventOverflow, 500)

export const fileExtension = filename => {
  const [ext] = filename.split('.').slice(-1)
  return ext
}
