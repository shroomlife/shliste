import type { BadgeRow } from '../db/schema'
import { getBadgesForView } from '../db/repositories'

/**
 * Verdiente Auszeichnungen aus der lokalen Datenbank.
 *
 * Ein Badge ist die Momentaufnahme eines fertig gekochten Rezepts — Name,
 * Farbe und Bildpfad zum Zeitpunkt des Verdienens. Es gibt keinen Katalog von
 * Badge-Typen; das Modell ist bewusst identisch zur Android-App.
 *
 * Aufbau wie `useLists`/`useRecipes`: `useState` als geteilte Sicht, `reload`
 * als einzige Leseoperation. Die Profilseite beobachtet `dataVersion` aus
 * `useSync` und lädt dann neu — dieselbe Richtung wie beim übrigen Lesen.
 */
export function useBadges() {
  const badges = useState<BadgeRow[]>('badges-view', () => [])
  const isLoading = useState<boolean>('badges-loading', () => false)

  async function reload(): Promise<void> {
    // IndexedDB gibt es nur im Browser; der App-Bereich rendert client-seitig.
    if (import.meta.server) return

    isLoading.value = true
    try {
      badges.value = await getBadgesForView()
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    badges: readonly(badges),
    isLoading: readonly(isLoading),
    reload,
  }
}
