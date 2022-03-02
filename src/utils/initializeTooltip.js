import { select } from 'd3'

export function initializeTooltip() {
  return select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      `opacity: 0; position: absolute; background-color: white;
        border-radius: 0.25rem; padding: 0.5rem 0.75rem; font-size: 0.75rem;
        line-height: 1rem; border: 1px solid #777;`,
    )
}
