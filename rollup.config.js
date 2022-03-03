import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default [
  {
    input: './src/ridgeline/chart.js',
    output: [
      {
        file: './dist/ridgeline/chart.js',
        format: 'umd',
        name: 'ridgeline', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
  {
    input: './src/sankey/chart.js',
    output: [
      {
        file: './dist/sankey/chart.js',
        format: 'umd',
        name: 'sankey', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
  {
    input: './src/fan/chart.js',
    output: [
      {
        file: './dist/fan/chart.js',
        format: 'umd',
        name: 'fan', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
  {
    input: './src/taxes/chart.js',
    output: [
      {
        file: './dist/taxes/chart.js',
        format: 'umd',
        name: 'taxes', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
  {
    input: './src/happiness/chart.js',
    output: [
      {
        file: './dist/happiness/chart.js',
        format: 'umd',
        name: 'happiness', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
  {
    input: './src/calendar/chart.js',
    output: [
      {
        file: './dist/calendar/chart.js',
        format: 'umd',
        name: 'calendar', // use this global var when using in the browser
      },
    ],
    plugins: [resolve(), terser()],
  },
]
