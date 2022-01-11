export function processCorporateTaxData(data) {
  // These values interfere with the simulation, so they need to be deleted
  const toDeleteProps = ['cx', 'cy', 'x', 'y']

  data.map(d => {
    d.company = d.name
    d['Effective tax rate'] = d.taxes / d.earnings
    d.fauxTaxRate = d['Effective tax rate']
    if (d['Effective tax rate'] < 0) {
      d.fauxTaxRate = 0.65
    } else if (d['Effective tax rate'] > 0.6) {
      d.fauxTaxRate = 0.6
    }
    toDeleteProps.forEach(k => delete d[k])
  })
  return data
}
