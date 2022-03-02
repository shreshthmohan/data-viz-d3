export function distanceInPoints({ x1, y1, x2, y2 }) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

// function midPoint({ x1, y1, x2, y2 }) {
//   return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
// }

export function stickRadius(w, l) {
  return Math.sqrt((w / 2) ** 2 + l ** 2)
}
export function thetaBy2(w, r) {
  return Math.atan(w / (2 * Math.sqrt(r ** 2 - (w / 2) ** 2)))
}

export function calculateMacePoints({ r1, r2, wl, pointCount = 50 }) {
  const pointsOnMaceStart = [
    [thetaBy2(wl, r2), r2],
    [thetaBy2(wl, r1), r1],
  ]

  const pointsOnMaceEnd = [
    [2 * Math.PI - thetaBy2(wl, r1), r1],
    [2 * Math.PI - thetaBy2(wl, r2), r2],
    [thetaBy2(wl, r2), r2],
  ]

  const extraPointsOnCircleCount = pointCount

  const extraPointsOnCircle = []
  const extraPointStartAngle = thetaBy2(wl, r1)
  const extraPointEndAngle = 2 * Math.PI - extraPointStartAngle

  const angleDiff = extraPointEndAngle - extraPointStartAngle
  const angleDelta = angleDiff / extraPointsOnCircleCount

  for (let i = 1; i < extraPointsOnCircleCount; i++) {
    extraPointsOnCircle.push([extraPointStartAngle + i * angleDelta, r1])
  }

  const allPointsOfMace = [
    ...pointsOnMaceStart,
    ...extraPointsOnCircle,
    ...pointsOnMaceEnd,
  ]
  return allPointsOfMace
}

// input
// stick start, end coordinates: x1, y1, x2, y2
// ball radius, stickWidth
export function maceShape({ x1, y1, x2, y2, circleRadius, stickWidth }) {
  const stickLength = distanceInPoints({ x1, y1, x2, y2 })
  const r1 = circleRadius
  // to be able to check if r2 is smaller than r1
  const r2Pre = stickRadius(stickWidth, stickLength)
  const r2 = r2Pre < r1 ? r1 : r2Pre

  const macePoints = calculateMacePoints({ r1, r2, wl: stickWidth })
  return macePoints
}

export function pointsToRotationAngle({ x1, y1, x2, y2 }) {
  const slopeTheta = (Math.atan((y1 - y2) / (x1 - x2)) * 180) / Math.PI

  const rotationAngle = x2 - x1 > 0 ? slopeTheta - 90 : slopeTheta + 90
  return rotationAngle
}
