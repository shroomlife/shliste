import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  app: {
    head: {
      title: 'shliste ~ Deine smarte Einkaufsliste',
      htmlAttrs: {
        lang: 'de',
      },
      meta: [
        { name: 'description', content: 'Erstelle und verwalte mühelos deine Einkaufslisten mit shliste. Pack Produkte ein, hake sie ab und behalte immer den Überblick beim Shoppen!' },
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
    environment: process.env.NUXT_ENVIRONMENT,
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
  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt', '@nuxtjs/seo', '@nuxtjs/sitemap'],
  eslint: {
    config: {
      stylistic: true,
    },
  },
  seo: {
    enabled: true,
  },
  site: {
    indexable: true,
    url: 'https://shliste.app',
  },
  nitro: {
    publicAssets: [
      {
        baseURL: '/server',
        dir: 'static',
      },
    ],
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // additionalData: '@import "@/assets/css/_variables.scss";',
          api: 'modern',
        },
      },
    },
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
