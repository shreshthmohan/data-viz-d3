export function toClassText(str) {
  return str
    .trim()
    .replace(/[\s&',.()]/g, '-')
    .toLowerCase()
}
