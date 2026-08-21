import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@nuxtjs/seo',
    '@vite-pwa/nuxt',
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
        // viewport-fit=cover: Ohne dieses Attribut liefert env(safe-area-inset-*)
        // auf iOS immer 0 — die fixe Bottom-Nav braucht den echten Wert.
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Erstelle und verwalte muehelos deine Einkaufslisten mit shliste. Pack Produkte ein, hake sie ab und behalte immer den Ueberblick beim Shoppen!' },
        // Entspricht --color-secondary aus dem Android-Farbschema (SecondaryColor)
        { name: 'theme-color', content: '#FDECF5' },
        // Beide Schreibweisen: Chrome hat die apple-Variante fuer veraltet
        // erklaert und will die standardisierte, Safari liest weiterhin die
        // eigene. Nur eine von beiden zu setzen kostet auf einer der beiden
        // Plattformen den Vollbildmodus der installierten App.
        { name: 'mobile-web-app-capable', content: 'yes' },
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
    // @nuxtjs/seo setzt html lang zur LAUFZEIT aus dieser Locale und
    // überschreibt damit still das htmlAttrs lang="de" aus app.head —
    // ohne den Eintrag stünde auf jeder SSR-Seite lang="en".
    defaultLocale: 'de',
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
    // Die Startseite wird NICHT prerendert, sondern gerendert und per SWR
    // gecacht: Eine prerenderte Seite liefert Nitro aus der statischen
    // Schicht aus, BEVOR Server-Middleware laeuft — der Eingeloggt-Redirect
    // (server/middleware/signed-in-redirect.ts) kaeme nie zum Zug. Mit SWR
    // laeuft die Middleware zuerst, Anonyme bekommen weiter die gecachte
    // Antwort. Empirisch am Produktionsbuild verifiziert, nicht vermutet.
    '/': { swr: 3600 },
    '/imprint': { prerender: true },
    '/privacy': { prerender: true },
    // Die alten deutschen Adressen sind seit Jahren im Umlauf und in
    // Suchmaschinen erfasst. 301 statt Ersatzlos-Weg, damit weder Nutzer noch
    // Rankings verloren gehen.
    '/impressum': { redirect: { to: '/imprint', statusCode: 301 } },
    '/datenschutz': { redirect: { to: '/privacy', statusCode: 301 } },
    // Der Listenbereich ist der Einstieg in die App. Die Umleitung greift
    // serverseitig und damit genau dort, wo /app noch ankommen kann:
    // Lesezeichen und der Start der installierten PWA. Innerhalb der App
    // zeigen alle Verweise direkt auf /app/lists.
    '/app': { redirect: { to: '/app/lists', statusCode: 302 } },
    // Der App-Bereich rendert ausschliesslich im Client — seine Daten liegen
    // in IndexedDB und sind auf dem Server nicht vorhanden.
    '/app/**': { ssr: false },
    // Diese eine Seite wird zusätzlich vorgerendert. Sie ist die Hülle, die der
    // Service Worker offline für JEDE /app-Adresse ausliefert (navigateFallback):
    // Weil im App-Bereich ohnehin nur der Browser rendert, ist die ausgelieferte
    // HTML-Datei für alle diese Adressen dieselbe, und der Router im Browser
    // setzt daraus die richtige Seite zusammen.
    '/app/lists': { prerender: true },
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

  // OG-Image-Generierung aus: sie zieht eine native resvg-Binary (rund 4 MB,
  // plattformspezifisch — die Windows-Variante landet sonst nutzlos im
  // Linux-Image) plus eingebettete Inter-Schriften. Fuer eine App hinter
  // Anmeldung bringt das nichts; die Startseite bekommt bei Bedarf ein
  // statisches OG-Bild.
  ogImage: { enabled: false },

  /**
   * Der Service Worker.
   *
   * WAS VORHER FEHLTE: Der handgeschriebene Vorgänger hatte KEIN
   * Precache-Manifest — der Cache füllte sich nur mit tatsächlich besuchten
   * Seiten. Der erste Offline-Aufruf einer noch nie besuchten Route schlug
   * damit fehl, was für eine App, die "Abhaken geht auch ohne Netz"
   * verspricht, nicht tragbar ist. Workbox erzeugt das Manifest beim Build
   * aus den echten Ausgabedateien.
   *
   * `prompt` statt `autoUpdate`: Ein Selbstneuladen mitten im Einkauf wäre
   * genau die Überraschung, die eine App nicht liefern soll. Die neue Fassung
   * wird angeboten, angenommen wird sie per Klick (siehe PwaPrompt.vue).
   */
  pwa: {
    registerType: 'prompt',

    manifest: {
      name: 'shliste ~ Deine smarte Einkaufsliste',
      short_name: 'shliste',
      description: 'Einkaufslisten und Rezepte, die auf allen Geräten gleich sind — auch ohne Netz.',
      lang: 'de',
      // Die installierte App startet direkt im Listenbereich und nicht auf der
      // Werbeseite: Wer sie installiert hat, ist überzeugt.
      start_url: '/app/lists',
      scope: '/',
      display: 'standalone',
      background_color: '#FFFFFF',
      // Identisch zum theme-color-Meta oben und zur SecondaryColor der
      // Android-App. Die alte manifest.json wich hier ab, was auf Android zu
      // zwei verschiedenen Tönungen der Systemleiste führte.
      theme_color: '#FDECF5',
      icons: [
        { src: '/images/logo/logo192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/images/logo/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        // Dasselbe Bild auch als maskable: Der Rand des Logos ist einfarbig
        // #FDECF5 bis in die Ecken und das Motiv liegt weit innerhalb der
        // sicheren Zone — Android darf also beschneiden, wie es mag.
        { src: '/images/logo/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}'],
      // Offline bekommt jede /app-Adresse die vorgerenderte Hülle. Ohne diese
      // Zeile wäre nur die eine besuchte Adresse offline erreichbar.
      navigateFallback: '/app/lists',
      navigateFallbackAllowlist: [/^\/app\//],
      // Die BFF-Aufrufe gehören nie in den Cache und nie auf die Hülle: Ein
      // gescheiterter Abgleich ist ein Fehler, den die Engine behandelt, und
      // keine HTML-Seite.
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      // Die eine bewusste Ausnahme vom "BFF-Aufrufe nie cachen" direkt darüber:
      // Rezeptbilder. Ihre Adresse trägt einen Inhalts-Hash — ein geändertes
      // Bild bekommt eine neue Adresse, ein Eintrag kann also nie veralten.
      // CacheFirst spart offline wie online jede zweite Anfrage; gecacht wird
      // nur eine echte 200, niemals eine Fehlerantwort.
      runtimeCaching: [
        {
          urlPattern: /\/api\/images\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'recipe-images',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
    },

    // In der Entwicklung aus: Ein Service Worker, der neben dem HMR-Server
    // Dateien ausliefert, macht aus jedem Fehler eine Frage nach dem Cache.
    devOptions: { enabled: false },

    // BEKANNT UND HARMLOS: Offline scheitert je Seitenaufruf eine Anfrage an
    // /api/_nuxt_icon. Die Icons erscheinen trotzdem, sie liegen im
    // Client-Bundle (43 Stueck, rund 10 KB) — nachgewiesen mit abgeschaltetem
    // Server. Zwei naheliegende Auswege wurden geprueft und verworfen:
    // `icon.provider: 'none'` unterbindet die Anfrage, laesst dann aber auch
    // die Icons der vorgerenderten Seiten leer; ein Laufzeit-Cache greift
    // nicht, weil jede Seite eine andere Icon-Kombination und damit eine
    // andere Adresse anfragt.
  },

  seo: { enabled: true },
})
