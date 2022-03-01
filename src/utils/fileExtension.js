export const fileExtension = filename => {
  const [ext] = filename.split('.').slice(-1)
  return ext
}
