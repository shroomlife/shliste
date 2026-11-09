import { isTrackedPath } from '~/utils/analyticsConsent'
import { isGoogleAnalyticsLoaded } from '~/utils/googleAnalytics'

/**
 * Die App unter /app bleibt ohne Google. Läuft gtag.js schon (Zustimmung auf
 * der Website), wechselt der Klick in die App per vollem Seitenaufruf: gtag.js
 * lässt sich nicht entladen, nur eine neue Seite startet ohne das Skript.
 * Ohne Zustimmung bleibt die Navigation unverändert schnell.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || isTrackedPath(to.path) || !isGoogleAnalyticsLoaded()) return
  return navigateTo(to.fullPath, { external: true })
})
