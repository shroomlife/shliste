import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#fdecf5', // main rose
          100: '#fde6f3',
          200: '#fdcde7',
          300: '#fda4d3',
          400: '#fb6bb4',
          500: '#f53f96',
          600: '#e41e73',
          700: '#c70f59',
          800: '#a4104a',
          900: '#891240',
          950: '#540322',
        },
        pink: {
          50: '#fcf3f9',
          100: '#fae9f5',
          200: '#f7d3ec',
          300: '#f2afdc',
          400: '#e87ec3',
          500: '#e064b2', // main pink
          600: '#cb378d',
          700: '#af2772',
          800: '#91235e',
          900: '#792251',
          950: '#490e2d',
        },
        green: {
          50: '#effaf5',
          100: '#d8f3e4',
          200: '#b4e6cd',
          300: '#7fd1ae', // main green
          400: '#4fb88f',
          500: '#2d9c74',
          600: '#1e7d5d',
          700: '#18644c',
          800: '#15503d',
          900: '#124234',
          950: '#09251d',
        },
      },
    },
  },
}
