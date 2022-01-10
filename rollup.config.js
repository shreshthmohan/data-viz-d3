import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default {
  input: './src/charts/fan/chart.input.js',
  output: [
    {
      file: './src/charts/fan/chart.js',
      format: 'umd',
      name: 'viz', // use this global var when using in the browser
      // globals: {
      //   'lodash-es': '_',
      //   'd3': 'd3',
      //   // when UMD script accesses sankey it's done as d3.sankey
      //   'd3-sankey': 'd3',
      //   'topojson': 'topojson',
      // },
    },
    // not sure if cjs will work if d3 doesn't support cjs
    // { file: 'dist/bundle.cjs.js', format: 'cjs' },
  ],
  plugins: [resolve(), terser()],
  // external: ['lodash-es', 'd3', 'd3-sankey', 'topojson'],
}
