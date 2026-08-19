import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@nuxtjs/seo',
  ],

  // SSR bleibt an: der Nitro-Server wird ohnehin gebraucht, weil er das
  // APP_SECRET haelt und die Anfragen an api.shliste.app signiert.
  // Die App-Seiten selbst rendern client-seitig (siehe routeRules) — ihre Daten
  // liegen offline-first in IndexedDB und existieren auf dem Server gar nicht.
  ssr: true,

  devtools: { enabled: false },

  app: {
    head: {
      title: 'shliste ~ Deine smarte Einkaufsliste',
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'description', content: 'Erstelle und verwalte muehelos deine Einkaufslisten mit shliste. Pack Produkte ein, hake sie ab und behalte immer den Ueberblick beim Shoppen!' },
        // Entspricht --color-secondary aus dem Android-Farbschema (SecondaryColor)
        { name: 'theme-color', content: '#FDECF5' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  site: {
    indexable: true,
    url: 'https://shliste.app',
  },

  // Start-Vibe Light. Dark Mode bleibt als Feature erhalten, ist aber nie
  // der Initialzustand ohne gespeicherte Praeferenz.
  colorMode: {
    preference: 'light',
  },

  runtimeConfig: {
    // NUR serverseitig. Landet niemals im Client-Bundle — alles unterhalb von
    // `public` wuerde beim Build ins Browser-Bundle inlined und waere damit
    // fuer jeden Besucher lesbar, unabhaengig davon ob das Repo public ist.
    apiBase: process.env.NUXT_API_BASE || 'https://api.shliste.app',
    appSecret: process.env.NUXT_APP_SECRET || '',

    public: {
      // Nur fuer die direkte SSE-Verbindung des Browsers zum Stream-Endpunkt.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.shliste.app',
      // Oeffentliche Google-Client-ID (kein Geheimnis). Muss identisch zu
      // GOOGLE_CLIENT_ID der API sein, sonst scheitert die aud-Pruefung.
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
  },

  routeRules: {
    // Oeffentliche Seiten werden vorgerendert: gut fuer SEO und First Paint.
    '/': { prerender: true },
    '/impressum': { prerender: true },
    '/datenschutz': { prerender: true },
    // Der App-Bereich rendert ausschliesslich im Client — seine Daten liegen
    // in IndexedDB und sind auf dem Server nicht vorhanden.
    '/app/**': { ssr: false },
  },

  future: { compatibilityVersion: 4 },
  compatibilityDate: '2026-08-19',

  nitro: {
    preset: 'bun',
  },

  vite: {
    plugins: [svgLoader({})],
    build: {
      // Keine Sourcemaps in Produktion: sie geben den Quelltext preis und
      // kosten Bandbreite, ohne dass sie jemand auswertet.
      sourcemap: false,
      cssCodeSplit: true,
    },
  },

  eslint: {
    config: { stylistic: true },
  },

  // Zain wird selbst gehostet statt per Link von Google geladen: eine
  // Offline-PWA darf nicht auf einen fremden Host angewiesen sein, und
  // @nuxt/fonts legt passende Fallback-Metriken an, was CLS verhindert.
  fonts: {
    families: [
      { name: 'Zain', provider: 'google', weights: [200, 300, 400, 700, 800, 900] },
    ],
  },

  seo: { enabled: true },
})
