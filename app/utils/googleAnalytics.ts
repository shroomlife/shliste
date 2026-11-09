/**
 * Google Analytics 4 über gtag.js, direkt und ohne Tag Manager: Was gemessen
 * wird, steht damit vollständig hier im Code.
 *
 * Dieses Modul lädt nur auf Anweisung. Ob geladen werden darf (Zustimmung,
 * Route, Mess-ID), entscheidet `plugins/analytics.client.ts`.
 */

import { googleAnalyticsCookieNames } from './analyticsConsent'

let loadedMeasurementId: string | null = null

function dataLayer(): unknown[] {
  const existing: unknown = Reflect.get(window, 'dataLayer')
  if (Array.isArray(existing)) return existing
  const created: unknown[] = []
  Reflect.set(window, 'dataLayer', created)
  return created
}

/**
 * gtag.js liest aus dem dataLayer das `arguments`-Objekt, kein Array. So steht
 * es in Googles eigenem Snippet, ein Rest-Parameter würde still ignoriert.
 */
function gtag(..._command: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments)
}

export function isGoogleAnalyticsLoaded(): boolean {
  return loadedMeasurementId !== null
}

/**
 * Lädt gtag.js genau einmal. Werbesignale bleiben immer abgelehnt, nur die
 * Statistik ist erlaubt, weil der Besucher genau dem zugestimmt hat.
 *
 * Seitenaufrufe zählt Google selbst, wie in „Measure single-page
 * applications“ empfohlen: beim Laden und per Enhanced Measurement bei
 * jedem Verlaufswechsel. Die App bleibt außen vor, weil der Weg dorthin
 * immer eine neue Seite ohne gtag.js ist (`middleware/analytics-boundary`).
 */
export function loadGoogleAnalytics(measurementId: string): void {
  if (loadedMeasurementId !== null) return
  loadedMeasurementId = measurementId

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  })
  gtag('consent', 'update', { analytics_storage: 'granted' })
  gtag('js', new Date())
  gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.append(script)
}

export function trackEvent(name: string, params: Record<string, string | number> = {}): void {
  if (loadedMeasurementId === null) return
  gtag('event', name, params)
}

/**
 * Beendet die Messung nach einem Widerruf. Ohne das schreibt gtag.js beim
 * Verlassen der Seite sein Sitzungscookie neu, nachdem wir es gelöscht haben.
 * `ga-disable-<ID>` ist Googles dokumentierter Schalter dafür; zusätzlich
 * wird die Zustimmung offiziell auf „denied“ gesetzt.
 */
export function stopGoogleAnalytics(measurementId: string): void {
  if (loadedMeasurementId === null) return
  Reflect.set(window, `ga-disable-${measurementId}`, true)
  gtag('consent', 'update', { analytics_storage: 'denied' })
}

/**
 * Entfernt die Cookies von gtag.js nach einem Widerruf. gtag setzt sie auf
 * die oberste Domain (`.shliste.app`), lokal ohne Domain, daher beide Wege.
 */
export function clearGoogleAnalyticsCookies(measurementId: string): void {
  for (const name of googleAnalyticsCookieNames(measurementId)) {
    document.cookie = `${name}=; Max-Age=0; path=/`
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`
  }
}
