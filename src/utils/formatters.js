import { format, timeParse, timeFormat } from 'd3'
import { replace } from 'lodash-es'
export const formatNumber = function (
  value,
  formatter = '',
  scientificNotations = false,
) {
  const formattedValue = format(formatter)(value)
  return scientificNotations
    ? formattedValue
    : replace(formattedValue, 'G', 'B') // Giga to Billion
}

export const formatDate = function (
  value,
  dateParser = null,
  dateFormatter = null,
) {
  const parsedDate = timeParse(dateParser)(value)
  const formattedDate = parsedDate
    ? timeFormat(dateFormatter)(parsedDate)
    : null
  return formattedDate || value
}
