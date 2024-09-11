// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'shliste - Deine Shopping Liste 🛒',
      htmlAttrs: {
        lang: 'de',
      },
      meta: [
        { name: 'description', content: 'Organisiere deine Einkäufe einfach und schnell mit deiner shliste. Einfach, intuitiv und kostenlos.' },
        { name: 'theme-color', content: '#FCE7F3' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Zain:wght@200;300;400;700;800;900&display=swap' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
      script: [
        { src: '/initSw.js' },
      ],
    },
  },
  css: [
    '@/assets/css/main.scss',
  ],
  build: {
    transpile: ['tailwindcss'],
  },
  compatibilityDate: '2024-09-10',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/ui', '@nuxt/eslint', '@pinia/nuxt'],
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
