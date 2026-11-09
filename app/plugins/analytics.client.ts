import { isTrackedPath } from '~/utils/analyticsConsent'
import { isGoogleAnalyticsLoaded, loadGoogleAnalytics, trackEvent } from '~/utils/googleAnalytics'

/**
 * Startet Google Analytics nur nach Zustimmung, nur auf der Website und nie
 * im Dev-Server, damit lokale Besuche nicht in den echten Zahlen landen.
 * Geprüft wird beim Start, bei jeder Entscheidung im Banner und nach jedem
 * Seitenwechsel (etwa aus der App zurück auf die Website).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { gaMeasurementId } = useRuntimeConfig().public
  const router = useRouter()
  const { choice, restore } = useAnalyticsConsent()

  restore()

  const measuring = !import.meta.dev && gaMeasurementId !== ''

  function startIfAllowed(): void {
    if (!measuring || isGoogleAnalyticsLoaded()) return
    if (choice.value !== 'granted' || !isTrackedPath(router.currentRoute.value.path)) return
    loadGoogleAnalytics(gaMeasurementId)
  }

  watch(choice, startIfAllowed)
  nuxtApp.hook('page:finish', startIfAllowed)

  // Links mit `data-analytics-event` melden ihren Klick, z. B. „App öffnen“.
  // Ein Listener für alle statt eines Handlers in jeder Komponente.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-event]') : null
    const name = target?.dataset.analyticsEvent
    if (target === null || target === undefined || name === undefined || name === '') return
    const location = target.dataset.analyticsLocation
    trackEvent(name, location === undefined ? {} : { location })
  })
})
