import type { UserProfile } from '#shared/types/domain'
import { removeListsOwnedByOthers } from '../db/repositories'

/**
 * Anmeldung — der optionale Teil dieser App.
 *
 * Ohne Konto ist die App vollständig benutzbar: Die Daten liegen in IndexedDB
 * und gehören dem Gerät. Ein Konto braucht man erst für den Abgleich zwischen
 * Geräten und für geteilte Listen. Deshalb hält hier nichts eine Ansicht auf
 * und nichts sperrt eine Bedienung — die Anmeldung ist eine Zugabe, keine
 * Voraussetzung.
 *
 * ANGEMELDET UND PROFIL SIND ZWEI GETRENNTE AUSSAGEN (Audit W2): Ob eine
 * Session besteht, entscheidet das Session-Cookie beim Server; das Profil ist
 * nur die Anzeige dazu. Ein unlesbares Profil-Cookie liefert `authenticated:
 * true` mit `profile: null` — die Oberfläche zeigt dann den
 * Platzhalter-Avatar, meldet aber NIEMANDEN ab. Wäre `isSignedIn` an das
 * Profil gekoppelt, würde ein bloßes Anzeigeproblem den Abgleich stoppen.
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
 * das Anzeigeprofil. Dasselbe gilt für das Refresh-Token: Der stille Refresh
 * läuft komplett in der BFF (server/utils/sessionRefresh.ts), dieser Code
 * merkt davon nichts.
 */
export function useAuth() {
  const profile = useState<UserProfile | null>('auth-profile', () => null)
  const authenticated = useState<boolean>('auth-authenticated', () => false)
  const isLoading = useState<boolean>('auth-loading', () => false)

  /**
   * Wurde die Sitzungsfrage schon einmal VERBINDLICH beantwortet?
   *
   * `authenticated` beginnt bei `false`, und das ist ein Startwert, keine
   * Auskunft. Scheitert der erste Aufruf — beim Kaltstart der installierten
   * App ohne Netz ist das der Regelfall, die Hülle kommt aus dem Cache und
   * `/api/**` nicht —, dann bliebe dieser Startwert stehen und würde ab da als
   * Tatsache gelten: kein Abgleich, kein Strom, und der Anmeldeknopf gesperrt,
   * weil auch `clientConfig` noch auf seinen Platzhaltern sitzt. Es gäbe
   * keinen Weg zurück, denn jeder Pfad, der die Frage neu stellen könnte,
   * verlangt selbst eine Anmeldung.
   *
   * Dieses Flag trennt deshalb "nicht angemeldet" von "noch nicht gefragt".
   * Wer den Unterschied braucht, liest es; `plugins/session.client.ts` fragt
   * weiter, solange es `false` ist.
   */
  const isSessionKnown = useState<boolean>('auth-session-known', () => false)

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

  const isSignedIn = computed<boolean>(() => authenticated.value)

  /**
   * Fragt beim eigenen Server nach, ob eine Sitzung besteht.
   *
   * Nur im Browser: Auf dem Server hätte `$fetch` die Cookies des Besuchers
   * nicht dabei und bekäme deshalb verlässlich "abgemeldet" zurück — ein
   * Ergebnis, das anschließend die Hydration widerlegen würde.
   */
  async function loadSession(): Promise<void> {
    if (import.meta.server) return

    isLoading.value = true
    try {
      const session = await $fetch('/api/auth/me')
      authenticated.value = session.authenticated
      profile.value = session.profile
      clientConfig.value = session.config
      isSessionKnown.value = true
    }
    catch (error) {
      // Ein gescheiterter Aufruf ist kein Beweis für "abgemeldet": Der Endpunkt
      // meldet den abgemeldeten Zustand ausdrücklich mit `authenticated: false`.
      // Kommt gar keine Antwort, war das Netz oder der Server das Problem, und
      // der bereits bekannte Zustand bleibt die bessere Auskunft als ein
      // erfundenes "nicht angemeldet".
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
   * durchgereicht: Nur die aufrufende Oberfläche weiß, wie sie einen
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
      authenticated.value = true
      // Eine geglückte Anmeldung beantwortet die Frage genauso verbindlich wie
      // `/api/auth/me` — auch wenn der Startaufruf nie durchkam.
      isSessionKnown.value = true
      return signedIn
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Beendet die Sitzung.
   *
   * Der lokale Zustand wird erst nach der Bestätigung des Servers geleert. Die
   * Wahrheit über den Anmeldezustand steht im httpOnly-Cookie, nicht in diesem
   * Zustand: Würde die Oberfläche schon vor der Antwort auf "abgemeldet"
   * springen und der Aufruf scheitern, sprünge sie beim nächsten
   * `loadSession()` wieder zurück. Die BFF widerruft dabei auch das
   * Refresh-Token bei der API (echter Widerruf, nicht nur Cookie-Löschen).
   *
   * Die lokalen Daten bleiben unangetastet. Abmelden heißt "kein Abgleich
   * mehr", nicht "Listen weg".
   */
  async function signOut(): Promise<void> {
    isLoading.value = true
    try {
      // VOR dem Leeren gelesen: Danach ist nicht mehr feststellbar, welche
      // Listen einem anderen Konto gehören.
      const ownUserId = profile.value?.userId ?? null

      await $fetch('/api/auth/logout', { method: 'POST' })
      profile.value = null
      authenticated.value = false

      /*
       * Fremde geteilte Listen gehen mit der Abmeldung — und nur die.
       *
       * Sie lagen hier als MITGLIEDSCHAFT, und die endet jetzt. Blieben sie
       * liegen, wären sie von eigenen Listen nicht mehr zu unterscheiden, und
       * der Erstabgleich eines ANDEREN Kontos auf demselben Gerät lüde sie als
       * dessen eigene hoch. Android macht das an dieser Stelle seit jeher
       * (`UserStore.signOut()`), die PWA hat es nachgezogen.
       *
       * Ohne bekannte eigene Id wird NICHTS gelöscht: Dann ließe sich fremd
       * nicht von eigen unterscheiden, und ein falscher Treffer wäre hier
       * nicht rückholbar. Lieber zu viel behalten als das Falsche wegwerfen.
       */
      if (ownUserId === null) {
        console.warn('[useAuth] Abmelden ohne bekannte eigene Id — fremde Listen bleiben liegen.')
      }
      else {
        const entfernt = await removeListsOwnedByOthers(ownUserId)
        if (entfernt > 0) console.info(`[useAuth] Abmelden: ${entfernt} fremde Liste(n) entfernt.`)
      }

      // Die Service-Worker-Caches der Bilder überleben das Cookie — auf einem
      // geteilten Gerät sollen sie mit der Sitzung gehen. Das gilt für
      // Rezeptbilder wie für die Vorschaubilder der Link-Einträge: Beide
      // liegen hinter der Anmeldung und verraten sonst, was auf den Listen
      // stand. Best effort: Ein Fehler hier darf das Abmelden nicht aufhalten.
      if (typeof caches !== 'undefined') {
        await Promise.all([
          caches.delete('recipe-images').catch(() => false),
          caches.delete('link-previews').catch(() => false),
        ])
      }
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    profile: readonly(profile),
    clientConfig: readonly(clientConfig),
    isSignedIn,
    isSessionKnown: readonly(isSessionKnown),
    isLoading: readonly(isLoading),
    loadSession,
    signIn,
    signOut,
  }
}
