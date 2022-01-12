module.exports = {
  content: ['./src/**/*.{html,js}'],
  // Had to turn this off to make tooltip tirangle work! :(
  // corePlugins: {
  //   preflight: false,
  // },
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
