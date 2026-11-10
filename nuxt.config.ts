import { marketingStories } from './app/data/marketingStories'
import { catalogRecipes } from './lib/recipes/catalog'
import svgLoader from 'vite-svg-loader'

const utilityRoutes = {
  '/imprint': { prerender: true, robots: 'noindex, follow' },
  '/privacy': { prerender: true, robots: 'noindex, follow' },
  '/warteliste': { robots: 'noindex, follow' },
  '/rezept-import/**': { robots: 'noindex, nofollow' },
}

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
  // API-Secret hält und die Anfragen an api.shliste.app signiert.
  // Die App-Seiten selbst rendern client-seitig (siehe routeRules) — ihre Daten
  // liegen offline-first in IndexedDB und existieren auf dem Server gar nicht.
  ssr: true,

  devtools: { enabled: false },

  app: {
    head: {
      title: 'shliste: Einkaufslisten und Rezepte',
      htmlAttrs: { lang: 'de' },
      meta: [
        // viewport-fit=cover: Ohne dieses Attribut liefert env(safe-area-inset-*)
        // auf iOS immer 0 — die fixe Bottom-Nav braucht den echten Wert.
        // interactive-widget=resizes-content: Die Bildschirmtastatur verkleinert
        // den Inhalt, statt ihn zu überdecken — Eingabeleiste und Listenende
        // bleiben damit über der Tastatur sichtbar (Chrome 108+, sonst wirkungslos).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content' },
        // description kommt aus site.description (nuxt-seo-utils) — nicht doppelt setzen.
        // Entspricht --color-secondary aus dem Android-Farbschema (SecondaryColor)
        { name: 'theme-color', content: '#FDECF5' },
        // Beide Schreibweisen: Chrome hat die apple-Variante für veraltet
        // erklärt und will die standardisierte, Safari liest weiterhin die
        // eigene. Nur eine von beiden zu setzen kostet auf einer der beiden
        // Plattformen den Vollbildmodus der installierten App.
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // Statisches OG-Bild: dynamische OG-Generierung bleibt aus (native Binary).
        { property: 'og:image', content: 'https://shliste.app/og-image.png' },
        { property: 'og:image:width', content: '1024' },
        { property: 'og:image:height', content: '1024' },
        { property: 'og:image:alt', content: 'shliste' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/logo/logo32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/images/logo/logo192.png' },
        { rel: 'apple-touch-icon', href: '/images/logo/logo192.png' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  site: {
    indexable: true,
    url: 'https://shliste.app',
    // Site Config leitet den Namen seit v4 nicht mehr aus der package.json ab.
    // Der Wert entspricht dem bisher abgeleiteten, damit Titel und Meta-Tags
    // der öffentlichen Seiten gleich bleiben.
    name: 'shliste',
    description: 'Gemeinsame Einkaufslisten und dein digitales Rezeptbuch. Plane den Einkauf, sammle Rezepte und koche Schritt für Schritt. Im Browser und auf Android, auf dem iPhone als Web-App.',
    // @nuxtjs/seo setzt html lang zur LAUFZEIT aus dieser Locale und
    // überschreibt damit still das htmlAttrs lang="de" aus app.head —
    // ohne den Eintrag stünde auf jeder SSR-Seite lang="en".
    defaultLocale: 'de',
  },

  // Start-Vibe Light. Dark Mode bleibt als Feature erhalten, ist aber nie
  // der Initialzustand ohne gespeicherte Präferenz.
  colorMode: {
    preference: 'light',
  },

  runtimeConfig: {
    // Nur explizit gestartete lokale Vorschauen dürfen Rechercheentwürfe ausliefern.
    recipeCatalogPreview: process.env.NUXT_RECIPE_CATALOG_PREVIEW === 'true',
    // NUR serverseitig. Landet niemals im Client-Bundle — alles unterhalb von
    // `public` würde beim Build ins Browser-Bundle inlined und wäre damit
    // für jeden Besucher lesbar, unabhängig davon ob das Repo public ist.
    apiBase: process.env.NUXT_API_BASE || 'https://api.shliste.app',
    // Bewusst nicht `appSecret`: Den Schlüssel reserviert Nuxt seit 4.6 als
    // eigenes Root-Secret und erzeugt im Dev still einen Zufallswert, wenn er
    // fehlt. Unsere Signatur würde dann damit gebildet statt laut zu scheitern.
    apiSecret: process.env.NUXT_API_SECRET || '',
    bffSecret: process.env.NUXT_BFF_SECRET || '',

    public: {
      // Nur für die direkte SSE-Verbindung des Browsers zum Stream-Endpunkt.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.shliste.app',
      // Öffentliche Google-Client-ID (kein Geheimnis). Muss identisch zu
      // GOOGLE_CLIENT_ID der API sein, sonst scheitert die aud-Prüfung.
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      // Web-Push VAPID (öffentlich). Leer = Push aus, SSE bleibt Vordergrund-Pfad.
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      // Google-Analytics-Mess-ID der Website (öffentlich). Fester Default, weil
      // prerenderte Seiten beim Image-Build entstehen, ohne Laufzeit-Env.
      // Leer = keine Messung. Geladen wird nur nach Zustimmung im Banner.
      gaMeasurementId: process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-XRRVDNBWGN',
    },
  },

  routeRules: {
    '/**': { headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' } },
    ...utilityRoutes,
    '/funktionen/rezept-badges': { prerender: true },
    '/funktionen/geheime-listen': { prerender: true },
    ...Object.fromEntries(marketingStories.map(story => [story.path, { prerender: true }])),
    '/im-alltag': { prerender: true },
    '/themenwelten': { prerender: true },
    '/themenwelten/raclette': { prerender: true },
    '/themenwelten/plaetzchen-backen': { prerender: true },
    // Die Startseite wird NICHT prerendert, sondern gerendert und per SWR
    // gecacht: Eine prerenderte Seite liefert Nitro aus der statischen
    // Schicht aus, BEVOR Server-Middleware läuft — der Eingeloggt-Redirect
    // (server/middleware/signed-in-redirect.ts) käme nie zum Zug. Mit SWR
    // läuft die Middleware zuerst, Anonyme bekommen weiter die gecachte
    // Antwort. Empirisch am Produktionsbuild verifiziert, nicht vermutet.
    // Im Dev-Server darf altes HTML nicht mit neuem HMR-Code gemischt werden.
    // Markdown-Negotiation: zusätzlich `/` als `/.md` (AI Ready); Accept-
    // Varies für SWR bewusst nicht verdoppelt — `.md`-URL reicht.
    '/': { swr: process.env.NODE_ENV === 'development' ? false : 3600 },
    '/rezepte': { prerender: true },
    '/rezeptideen': { prerender: false },
    '/rezepte/**': { prerender: false },
    '/funktionen/rezepte': { prerender: true },
    '/gemeinsam-einkaufen': { prerender: true },
    '/so-funktionierts': { prerender: true },
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
    // Der App-Bereich rendert ausschließlich im Client — seine Daten liegen
    // in IndexedDB und sind auf dem Server nicht vorhanden.
    // robots: false → noindex/nofollow (crawlable genug für das Meta-Tag;
    // nicht per robots.txt sperren, sonst liest Google das noindex nicht).
    '/app/**': { ssr: false, robots: false },
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

  // Offizielles LLM-Discoverability: /llms.txt und Markdown-Export.
  // Boolean `true` ist ungültig — das Modul erwartet ein Config-Objekt.
  aiReady: {
    contentSignal: { search: true, aiInput: true, aiTrain: false },
    llmsTxt: {
      notes: 'Listen und Rezepte in shliste. Einkaufen und Kochen zusammen, mit KI wo’s hilft.',
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

  /**
   * Icons ins Client-Bundle scannen — sonst hängen alle 56 am Laufzeitabruf und
   * warnen bei jedem Fehlschlag erneut. `globInclude` nennt die Dateitypen DIESES
   * Projekts, statt den Scanner-Standard zu kopieren (der veraltete still); `.ts`
   * muss mit, zwei Icons stehen in einem Composable. `scan` ist upstream noch als
   * experimentell markiert, der Server-Provider bleibt deshalb als Netz bestehen.
   */
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,ts}'],
      },
    },
  },

  // OG-Image-Generierung aus: sie zieht eine native resvg-Binary (rund 4 MB,
  // plattformspezifisch — die Windows-Variante landet sonst nutzlos im
  // Linux-Image) plus eingebettete Inter-Schriften. Für eine App hinter
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
   * Neue Fassungen werden im Hintergrund geladen und automatisch aktiviert.
   * Sobald das Update bereit ist, werden offene Ansichten neu geladen.
   * periodicSyncForUpdates entdeckt Updates auch bei längerer Nutzung.
   */
  pwa: {
    registerType: 'autoUpdate',

    client: {
      // Alle 60 Sekunden auf eine neue Fassung prüfen.
      periodicSyncForUpdates: 60,
    },

    manifest: {
      name: 'shliste',
      short_name: 'shliste',
      description: 'Listen und Rezepte in shliste. Offline nutzbar; mit Anmeldung zwischen Browser und Android abgleichen. iPhone über die Web-App.',
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
      /**
       * Die installierte App als Ziel für „Teilen".
       *
       * GET und nicht POST: Wir empfangen Text und eine Adresse, keine
       * Dateien. GET braucht dafür keinen Service-Worker-Eingriff — das
       * Betriebssystem öffnet schlicht `/app/share?title=…&text=…&url=…`,
       * und die Seite liest den Abfrageteil. Ein POST müsste im Service
       * Worker abgefangen und zwischengespeichert werden, mit allem, was
       * daran schiefgehen kann.
       *
       * Die Zieladresse liegt innerhalb von `scope` und wird vom
       * navigateFallback abgedeckt, funktioniert also auch offline.
       */
      share_target: {
        action: '/app/share',
        method: 'GET',
        params: { title: 'title', text: 'text', url: 'url' },
      },
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
      // Marketing-Illustrationen sind kein Bestandteil der Offline-App-Hülle.
      globIgnores: ['**/images/illustrations/**'],
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
          urlPattern: /\/images\/editorial\//,
          handler: 'CacheFirst',
          options: { cacheName: 'shliste-editorial-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 250, maxAgeSeconds: 365 * 24 * 60 * 60 } },
        },
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
        // Dieselbe Begründung für die Vorschaubilder der Link-Einträge: Ihre
        // Adresse trägt die Prüfsumme des Bildes, ein Eintrag kann also nie
        // veralten. Mehr Einträge als bei Rezeptbildern, weil eine einzige
        // Liste voller Links schon Dutzende braucht — und sie sind mit 160
        // Pixeln Kantenlänge deutlich kleiner.
        {
          urlPattern: /\/api\/link-previews\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'link-previews',
            expiration: {
              maxEntries: 300,
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

    // Die Icons liegen seit dem Scan-Bundle (siehe `icon` oben) im Client,
    // offline entsteht keine Anfrage an /api/_nuxt_icon mehr. Die frühere
    // Notiz zählte 43 Icons — das waren Nuxt UIs eigene, nicht die der App.
    // `icon.provider: 'none'` bleibt verworfen: es lässt die Icons der
    // vorgerenderten Seiten leer.
  },

  seo: { enabled: true },

  // App-Shells gehören nicht in die Sitemap — dünne SPA ohne Marketing-Inhalt.
  sitemap: {
    exclude: ['/app', '/app/**', '/api/**', ...Object.keys(utilityRoutes), '/ki-warteliste', '/impressum', '/datenschutz', '/funktionen/rezepte', ...catalogRecipes.filter(recipe => recipe.status !== 'published').map(recipe => `/rezepte/${recipe.slug}`)],
    urls: ['/themenwelten', '/themenwelten/raclette', '/themenwelten/plaetzchen-backen', '/im-alltag', ...marketingStories.map(story => story.path), ...catalogRecipes.filter(recipe => recipe.status === 'published').map(recipe => `/rezepte/${recipe.slug}`)],
  },

  // Ebenfalls neu mit @nuxtjs/seo 6. Skew Protection überschneidet sich mit
  // dem Update-Ablauf des Service Workers (siehe `pwa`) und braucht einen
  // Build-Cache zwischen den Deploys, den der Docker-Build nicht hat.
  skewProtection: false,
})
