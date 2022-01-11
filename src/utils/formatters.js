import { format } from 'd3'
export const formatNumber = function (
  value,
  formatter = '',
  scientificNotations = false,
) {
  const formattedValue = format(formatter)(value)
  return scientificNotations ? formattedValue : formattedValue.replace('G', 'B')
}

// export const formatDate = function (
//   value,
//   dateParser = null,
//   dateFormatter = null,
// ) {
//   const parsedDate = timeParse(dateParser)(value)
//   const formattedDate = parsedDate
//     ? timeFormat(dateFormatter)(parsedDate)
//     : null
//   return formattedDate || value
// }
