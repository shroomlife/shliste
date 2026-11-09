import { CONSENT_STORAGE_KEY, parseStoredConsent, serializeConsent, type ConsentChoice } from '~/utils/analyticsConsent'
import { clearGoogleAnalyticsCookies, isGoogleAnalyticsLoaded, stopGoogleAnalytics } from '~/utils/googleAnalytics'

/**
 * Die Statistik-Zustimmung als gemeinsamer Zustand für Banner, Footer und
 * Plugin. Gespeichert wird nur im localStorage dieses Browsers; ist er
 * gesperrt (privates Fenster), fragt der Banner beim nächsten Besuch neu.
 */
export function useAnalyticsConsent() {
  const choice = useState<ConsentChoice | null>('analytics-consent', () => null)
  const restored = useState<boolean>('analytics-consent-restored', () => false)
  const settingsOpen = useState<boolean>('analytics-consent-settings', () => false)
  const { gaMeasurementId } = useRuntimeConfig().public

  const bannerVisible = computed(() => restored.value && (choice.value === null || settingsOpen.value))

  function restore(): void {
    try {
      choice.value = parseStoredConsent(localStorage.getItem(CONSENT_STORAGE_KEY), new Date())
    }
    catch {
      choice.value = null
    }
    restored.value = true
  }

  function decide(next: ConsentChoice): void {
    const previous = choice.value
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(next, new Date()))
    }
    catch {
      // Ohne Speicher gilt die Wahl nur für diesen Besuch.
    }
    choice.value = next
    settingsOpen.value = false

    if (next === 'denied' && previous === 'granted') {
      stopGoogleAnalytics(gaMeasurementId)
      clearGoogleAnalyticsCookies(gaMeasurementId)
      // gtag.js lässt sich nicht entladen. Erst ein Neuladen beendet die Messung sicher.
      if (isGoogleAnalyticsLoaded()) window.location.reload()
    }
  }

  return {
    choice: readonly(choice),
    bannerVisible,
    restore,
    accept: () => decide('granted'),
    reject: () => decide('denied'),
    openSettings: () => {
      settingsOpen.value = true
    },
  }
}
