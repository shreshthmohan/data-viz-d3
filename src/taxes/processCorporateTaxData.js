export function processCorporateTaxData(data) {
  // These values interfere with the simulation, so they need to be deleted
  const toDeleteProps = ['cx', 'cy', 'x', 'y']
  const million = 1e6

  data.map(d => {
    d.company = d.name

    // taxes,capitalization	and earnings numbers are in million in data
    // to make formatting easier converting to dollars
    d.taxes = d.taxes * million
    d.capitalization = d.capitalization * million
    d.earnings = d.earnings * million

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
