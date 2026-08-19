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
import { clearSessionCookies, readProfile, readSessionToken, type UserProfile } from '../../utils/session'

interface SessionState {
  authenticated: boolean
  /**
   * Ob die Session gerade gegen die API bestätigt wurde. `false` heisst
   * "nicht widerlegt", nicht "ungültig" — die App darf dann offline weiterarbeiten.
   */
  verified: boolean
  profile: UserProfile | null
}

const SIGNED_OUT: SessionState = { authenticated: false, verified: true, profile: null }

export default defineEventHandler(async (event): Promise<SessionState> => {
  const sessionToken = readSessionToken(event)
  const profile = readProfile(event)

  // Nur eines von beiden vorhanden heisst: halber Zustand. Aufräumen und
  // abgemeldet melden, statt mit einem unvollständigen Profil weiterzumachen.
  if (sessionToken === undefined || profile === null) {
    if (sessionToken !== undefined || profile !== null) clearSessionCookies(event)
    return SIGNED_OUT
  }

  try {
    await apiFetch('/sync/status', { sessionToken })
    return { authenticated: true, verified: true, profile }
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
      return { authenticated: true, verified: false, profile }
    }

    clearSessionCookies(event)
    return SIGNED_OUT
  }
})
