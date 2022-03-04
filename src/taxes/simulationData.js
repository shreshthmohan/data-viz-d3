const Papa = require('papaparse')
const fs = require('fs')

// populate the arrays below with split and combined simulation result
const combinedSimulationData = []
const splitSimulationData = []

const toDeleteProps = ['vx', 'vy', 'x', 'y', 'index']

const joinedSimulationData = combinedSimulationData.map((d, i) => {
  let joinedRow = {}
  if (d.name === splitSimulationData[i].name) {
    const e = splitSimulationData[i]
    joinedRow = {
      ...d,
      combinedX: d.x,
      combinedY: d.y,
      splitX: e.x,
      splitY: e.y,
    }
    // delete joinedRow.index
    toDeleteProps.forEach(k => delete joinedRow[k])
  } else {
    throw new Error()
  }
  return joinedRow
})

const unparsed = Papa.unparse(joinedSimulationData, { delimiter: '\t' })

fs.writeFileSync('./simulationData.tsv', unparsed)
