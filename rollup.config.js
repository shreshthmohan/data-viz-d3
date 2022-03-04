import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default [
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
  // {
  //   input: './src/taxes-sim/chart.js',
  //   output: [
  //     {
  //       file: './dist/taxes-sim/chart.js',
  //       format: 'umd',
  //       name: 'taxes-sim', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },

  // {
  //   input: './src/sankey/chart.js',
  //   output: [
  //     {
  //       file: './dist/sankey/chart.js',
  //       format: 'umd',
  //       name: 'sankey', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },
  // {
  //   input: './src/fan/chart.js',
  //   output: [
  //     {
  //       file: './dist/fan/chart.js',
  //       format: 'umd',
  //       name: 'fan', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },

  // {
  //   input: './src/happiness/chart.js',
  //   output: [
  //     {
  //       file: './dist/happiness/chart.js',
  //       format: 'umd',
  //       name: 'happiness', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },
  // {
  //   input: './src/calendar/chart.js',
  //   output: [
  //     {
  //       file: './dist/calendar/chart.js',
  //       format: 'umd',
  //       name: 'calendar', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },
]
