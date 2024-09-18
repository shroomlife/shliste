import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  app: {
    head: {
      title: 'shliste - Deine Shopping Liste 🛒',
      htmlAttrs: {
        lang: 'de',
      },
      meta: [
        { name: 'description', content: 'Organisiere deine Einkäufe einfach und schnell mit deiner persönlichen shliste. Einfach, intuitiv und kostenlos.' },
        { name: 'theme-color', content: '#FCE7F3' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Zain:wght@200;300;400;700;800;900&display=swap' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      script: [
        { src: '/initSw.js' },
      ],
    },
  },
  css: [
    '@/assets/css/main.scss',
  ],
  runtimeConfig: {
    google: {
      client: {
        id: process.env.NUXT_GOOGLE_CLIENT_ID,
        secret: process.env.NUXT_GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.NUXT_GOOGLE_REDIRECT_URI,
      },
    },
    openai: {
      apiKey: process.env.NUXT_OPENAI_API_KEY,
    },
  },
  build: {
    transpile: ['tailwindcss'],
  },
  compatibilityDate: '2024-09-10',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  ssr: false,
  colorMode: {
    preference: 'light',
  },
  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt'],
  eslint: {
    config: {
      stylistic: true,
    },
  },

  vite: {
    plugins: [
      svgLoader({}),
    ],
    build: {
      sourcemap: true,
      minify: 'terser',
      cssCodeSplit: true,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    cacheDir: '.vite',
  },
})
