import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default [
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
  // {
  //   input: './src/fan1/chart.js',
  //   output: [
  //     {
  //       file: './dist/fan1/chart.js',
  //       format: 'umd',
  //       name: 'fan1', // use this global var when using in the browser
  //     },
  //   ],
  //   plugins: [resolve(), terser()],
  // },
]
