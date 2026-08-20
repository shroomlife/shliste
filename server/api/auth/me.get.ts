/**
 * Besteht eine Session, und wenn ja: wer ist angemeldet?
 *
 * Warum trotz vorhandenem Cookie ein Aufruf an die API erfolgt:
 * Das Session-JWT ist von der API signiert, nicht von dieser App. Diese Schicht
 * kennt das JWT_SECRET nicht und kann deshalb weder Signatur noch Ablaufdatum
 * prüfen. Ein Cookie zu sehen beweist also nur, dass irgendwann eine Anmeldung
 * stattfand. Würde allein daraus "angemeldet" gemeldet, liefe die Oberfläche
 * nach Ablauf des Tokens in eine Sackgasse: sie zeigt ein Profil, und jeder
 * Sync antwortet 401.
 *
 * `GET /sync/status` ist dafür der günstigste Beleg — es ist ohnehin der
 * Preflight des Sync, liefert nur Zähler und läuft über dieselbe
 * Bearer-Prüfung wie alle Sync-Routen.
 *
 * Das Profil kommt weiter aus dem Cookie: die API hat keinen Endpunkt, der es
 * zu einer bestehenden Session herausgibt (`/auth/google` gibt es nur einmal
 * beim Anmelden aus).
 */
import { apiFetch, isSessionExpiredError } from '../../utils/apiFetch'
import type { UserProfile } from '#shared/types/domain'
import { clearSessionCookies, readProfile, readSessionToken } from '../../utils/session'

/**
 * Werte, die der Browser braucht, die aber vom Server kommen MÜSSEN.
 *
 * WARUM NICHT ÜBER `runtimeConfig.public`: Der App-Bereich wird vorgerendert
 * (`/app/lists` dient dem Service Worker als Hülle für jede Adresse). Beim
 * Vorrendern backt Nuxt die öffentliche Konfiguration in die Seite ein — im
 * Docker-Build, wo keine Umgebungsvariablen gesetzt sind. Eine später auf dem
 * Server gesetzte `NUXT_PUBLIC_*` erreicht diese Seite deshalb nie.
 *
 * Genau das ist in Produktion passiert: Der Anmeldeknopf blieb gesperrt mit
 * "NUXT_PUBLIC_GOOGLE_CLIENT_ID fehlt", obwohl die Variable auf dem Server
 * stand. Über diesen Endpunkt kommen die Werte zur Laufzeit — unabhängig
 * davon, wann und wie die Seite gerendert wurde.
 */
interface ClientConfig {
  /** Öffentliche Google-Client-ID. Kein Geheimnis, aber ohne sie kein Anmelden. */
  googleClientId: string
  /** Basisadresse der API für den Echtzeit-Strom des Browsers. */
  apiBase: string
}

interface SessionState {
  authenticated: boolean
  /**
   * Ob die Session gerade gegen die API bestätigt wurde. `false` heisst
   * "nicht widerlegt", nicht "ungültig" — die App darf dann offline weiterarbeiten.
   */
  verified: boolean
  profile: UserProfile | null
  config: ClientConfig
}

function readClientConfig(): ClientConfig {
  const { public: publicConfig } = useRuntimeConfig()
  return {
    googleClientId: publicConfig.googleClientId,
    apiBase: publicConfig.apiBase,
  }
}

export default defineEventHandler(async (event): Promise<SessionState> => {
  const sessionToken = readSessionToken(event)
  const profile = readProfile(event)

  // Nur eines von beiden vorhanden heisst: halber Zustand. Aufräumen und
  // abgemeldet melden, statt mit einem unvollständigen Profil weiterzumachen.
  if (sessionToken === undefined || profile === null) {
    if (sessionToken !== undefined || profile !== null) clearSessionCookies(event)
    return { authenticated: false, verified: true, profile: null, config: readClientConfig() }
  }

  try {
    await apiFetch('/sync/status', { sessionToken })
    return { authenticated: true, verified: true, profile, config: readClientConfig() }
  }
  catch (error) {
    // Nur 401 bedeutet "Session tot". Alles andere — 403 (Signatur oder
    // Serveruhr), 429, 502 — sagt nichts über die Session aus; den Nutzer
    // deswegen abzumelden wäre falsch und würde bei einem Konfigurationsfehler
    // reihenweise Konten aussperren.
    if (!isSessionExpiredError(error)) {
      // Sichtbar machen, statt still zu degradieren: ein dauerhaftes 403 wäre
      // ein Konfigurationsproblem (Secret oder Serveruhr) und würde sonst
      // niemandem auffallen, weil die Oberfläche einfach weiterläuft.
      console.warn('[auth/me] Session nicht prüfbar:', error instanceof Error ? error.message : error)
      return { authenticated: true, verified: false, profile, config: readClientConfig() }
    }

    clearSessionCookies(event)
    return { authenticated: false, verified: true, profile: null, config: readClientConfig() }
  }
})
