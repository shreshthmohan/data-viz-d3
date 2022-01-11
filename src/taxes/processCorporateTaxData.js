// global window
export function processCorporateTaxData(data) {
  // capitalization
  // earnings
  // taxes
  // sector
  // name
  // alias
  // symbol

  const toDeleteProps = ['cx', 'cy', 'x', 'y']

  // calculate Effective tax rate
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
