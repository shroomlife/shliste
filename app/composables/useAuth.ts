import type { UserProfile } from '#shared/types/domain'

/**
 * Anmeldung — der optionale Teil dieser App.
 *
 * Ohne Konto ist die App vollständig benutzbar: Die Daten liegen in IndexedDB
 * und gehören dem Gerät. Ein Konto braucht man erst für den Abgleich zwischen
 * Geräten und für geteilte Listen. Deshalb hält hier nichts eine Ansicht auf
 * und nichts sperrt eine Bedienung — die Anmeldung ist eine Zugabe, keine
 * Voraussetzung.
 *
 * Bewusst `$fetch` statt `useFetch`: Anmelden und Abmelden passieren in
 * Ereignisbehandlern und sind Aktionen, keine Daten, die eine Ansicht zum
 * Rendern braucht. `useFetch` würde dafür einen Ladezyklus samt Cache-Schlüssel
 * und Hydrationszustand aufziehen, den niemand liest.
 *
 * Der Zustand liegt in `useState`: Wer angemeldet ist, ist eine Eigenschaft der
 * App und nicht der einzelnen Komponente. Zwei Komponenten mit zwei eigenen
 * `ref`s würden sonst auseinanderlaufen, sobald sich an einer Stelle etwas ändert.
 *
 * Das Session-JWT selbst taucht hier nirgends auf. Es steht in einem
 * httpOnly-Cookie und ist für JavaScript unerreichbar; diese Schicht kennt nur
 * das Anzeigeprofil.
 */
export function useAuth() {
  const profile = useState<UserProfile | null>('auth-profile', () => null)
  const isLoading = useState<boolean>('auth-loading', () => false)

  /**
   * Werte, die der Server liefert, weil die Seite sie nicht kennen kann.
   *
   * Der App-Bereich wird vorgerendert; dabei backt Nuxt `runtimeConfig.public`
   * zur BAUZEIT ein — im Docker-Build, ohne Umgebungsvariablen. Was später auf
   * dem Server gesetzt wird, erreicht diese Seite nie. Deshalb kommen die
   * Werte über `/api/auth/me` mit, das ohnehin beim Start abgefragt wird.
   */
  const clientConfig = useState<{ googleClientId: string, apiBase: string }>(
    'auth-client-config',
    () => ({ googleClientId: '', apiBase: 'https://api.shliste.app' }),
  )

  const isSignedIn = computed<boolean>(() => profile.value !== null)

  /**
   * Fragt beim eigenen Server nach, ob eine Sitzung besteht.
   *
   * Nur im Browser: Auf dem Server hätte `$fetch` die Cookies des Besuchers
   * nicht dabei und bekäme deshalb verlässlich "abgemeldet" zurück — ein
   * Ergebnis, das anschliessend die Hydration widerlegen würde.
   */
  async function loadSession(): Promise<void> {
    if (import.meta.server) return

    isLoading.value = true
    try {
      const session = await $fetch('/api/auth/me')
      profile.value = session.profile
      clientConfig.value = session.config
    }
    catch (error) {
      // Ein gescheiterter Aufruf ist kein Beweis für "abgemeldet": Der Endpunkt
      // meldet den abgemeldeten Zustand ausdrücklich mit `profile: null`. Kommt
      // gar keine Antwort, war das Netz oder der Server das Problem, und das
      // bereits bekannte Profil bleibt die bessere Auskunft als ein erfundenes
      // "nicht angemeldet".
      console.warn('[useAuth] Sitzung konnte nicht geprüft werden:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Tauscht ein Google-ID-Token gegen eine Sitzung.
   *
   * Geprüft wird das Token weder hier noch in der BFF, sondern erst von
   * api.shliste.app (Signatur, Aussteller, aud). Fehler werden absichtlich
   * durchgereicht: Nur die aufrufende Oberfläche weiss, wie sie einen
   * fehlgeschlagenen Anmeldeversuch anzeigen will.
   */
  async function signIn(idToken: string): Promise<UserProfile> {
    isLoading.value = true
    try {
      const signedIn = await $fetch('/api/auth/google', {
        method: 'POST',
        body: { idToken },
      })
      profile.value = signedIn
      return signedIn
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Beendet die Sitzung.
   *
   * Das lokale Profil wird erst nach der Bestätigung des Servers geleert. Die
   * Wahrheit über den Anmeldezustand steht im httpOnly-Cookie, nicht in diesem
   * Zustand: Würde die Oberfläche schon vor der Antwort auf "abgemeldet"
   * springen und der Aufruf scheitern, sprünge sie beim nächsten
   * `loadSession()` wieder zurück.
   *
   * Die lokalen Daten bleiben unangetastet. Abmelden heisst "kein Abgleich
   * mehr", nicht "Listen weg".
   */
  async function signOut(): Promise<void> {
    isLoading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      profile.value = null
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    profile: readonly(profile),
    clientConfig: readonly(clientConfig),
    isSignedIn,
    isLoading: readonly(isLoading),
    loadSession,
    signIn,
    signOut,
  }
}
