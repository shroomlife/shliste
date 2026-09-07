/**
 * Besteht eine Session, und wenn ja: wer ist angemeldet?
 *
 * Warum trotz vorhandenem Cookie ein Aufruf an die API erfolgt:
 * Das Session-JWT ist von der API signiert, nicht von dieser App. Diese Schicht
 * kennt das JWT_SECRET nicht und kann deshalb weder Signatur noch Ablaufdatum
 * verbindlich prüfen. Ein Cookie zu sehen beweist also nur, dass irgendwann
 * eine Anmeldung stattfand. Würde allein daraus "angemeldet" gemeldet, liefe
 * die Oberfläche nach Ablauf des Tokens in eine Sackgasse: sie zeigt ein
 * Profil, und jeder Sync antwortet 401.
 *
 * Das Lebenszeichen ist `GET /sync/session` — die billigste Route der API:
 * sie tut nichts außer den userAuth-Guard zu durchlaufen. Das frühere
 * `/sync/status` zählte bei jedem Aufruf Listen und Rezepte des Kontos (W9).
 *
 * Zwei Grundsätze dieser Route (Audit W1 + W2):
 * - Ein unlesbares oder fehlendes PROFIL-Cookie ist ein ANZEIGEPROBLEM, kein
 *   Abmeldegrund. Die Session bleibt; der Client zeigt dann einen
 *   Platzhalter-Avatar (`profile: null` bei `authenticated: true`).
 * - Cookies werden NUR gelöscht, wenn die Session ENDGÜLTIG tot ist: 401 der
 *   API UND kein Refresh mehr möglich. Netzfehler, 5xx, 403, 429 sagen über
 *   die Session nichts aus und melden `verified: false` — die App arbeitet
 *   offline weiter.
 *
 * Das Profil kommt weiter aus dem Cookie: die API hat keinen Endpunkt, der es
 * zu einer bestehenden Session herausgibt (`/auth/google` gibt es nur einmal
 * beim Anmelden aus).
 */
import { apiFetch, isSessionExpiredError } from '../../utils/apiFetch'
import type { UserProfile } from '#shared/types/domain'
import { clearSessionCookies, readProfile, readRefreshToken } from '../../utils/session'
import { getFreshSessionToken, resolveSessionToken } from '../../utils/sessionRefresh'

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
   * Ob die Session gerade gegen die API bestätigt wurde. `false` heißt
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
  const config = readClientConfig()

  // Beschafft ein verwendbares Token und refresht dabei still, falls das
  // JWT (fast) abgelaufen ist. `refreshDenied` unterscheidet das endgültige
  // Aus vom bloßen "gerade nicht beschaffbar".
  const { sessionToken, refreshDenied } = await resolveSessionToken(event)

  if (sessionToken === null) {
    if (refreshDenied) {
      // Die API hat den Refresh endgültig abgelehnt; die Cookies sind bereits
      // gelöscht (sessionRefresh.ts). Ehrlich abgemeldet melden.
      return { authenticated: false, verified: true, profile: null, config }
    }

    if (readRefreshToken(event) !== undefined) {
      // Seltener halber Zustand: Refresh-Cookie da, aber weder ein
      // Access-Token noch eine erreichbare API. Das ist TRANSIENT — die
      // Session-Familie ist nicht widerlegt, also nicht abmelden. Der
      // nächste Aufruf refresht, sobald die API wieder da ist.
      return { authenticated: true, verified: false, profile: readProfile(event), config }
    }

    // Nie angemeldet. Ein verwaistes Profil-Cookie (halber Zustand) wird
    // geräumt, statt ein Profil ohne Session anzuzeigen.
    if (readProfile(event) !== null) clearSessionCookies(event)
    return { authenticated: false, verified: true, profile: null, config }
  }

  // Anzeigeproblem ≠ Abmeldegrund (W2): `null` bleibt `null`, die Session
  // besteht weiter und die Oberfläche zeigt den Platzhalter-Avatar.
  const profile = readProfile(event)
  const clientIp = resolveVisitorIp(event)

  try {
    await apiFetch('/sync/session', { sessionToken, clientIp })
    return { authenticated: true, verified: true, profile, config }
  }
  catch (error) {
    // Nur 401 bedeutet "dieses Token ist tot". Alles andere — 403 (Signatur
    // oder Serveruhr), 429, 502 — sagt nichts über die Session aus; den
    // Nutzer deswegen abzumelden wäre falsch und würde bei einem
    // Konfigurationsfehler reihenweise Konten aussperren (W1).
    if (!isSessionExpiredError(error)) {
      // Sichtbar machen, statt still zu degradieren: ein dauerhaftes 403 wäre
      // ein Konfigurationsproblem (Secret oder Serveruhr) und würde sonst
      // niemandem auffallen, weil die Oberfläche einfach weiterläuft.
      console.warn('[auth/me] Session nicht prüfbar:', error instanceof Error ? error.message : error)
      return { authenticated: true, verified: false, profile, config }
    }

    // 401 trotz rechnerisch gültigem Token (serverseitig widerrufen oder
    // JWT_SECRET rotiert): genau EIN erzwungener Refresh-Versuch und genau
    // EIN zweites Lebenszeichen. Die Wiederholungs-Disziplin (kein blindes
    // Retry des Refresh selbst) steckt in sessionRefresh.ts.
    const retryToken = await getFreshSessionToken(event, { force: true })

    if (retryToken !== null && retryToken !== sessionToken) {
      try {
        await apiFetch('/sync/session', { sessionToken: retryToken, clientIp })
        return { authenticated: true, verified: true, profile, config }
      }
      catch (retryError) {
        if (!isSessionExpiredError(retryError)) {
          return { authenticated: true, verified: false, profile, config }
        }
        // Frisch refresht und trotzdem 401 — endgültiger geht es nicht.
        clearSessionCookies(event)
        return { authenticated: false, verified: true, profile: null, config }
      }
    }

    if (retryToken !== null) {
      // Kein NEUES Token: Entweder gibt es kein Refresh-Cookie (Legacy) —
      // dann ist der 401 endgültig — oder der Refresh war gerade nicht
      // möglich (Netz/5xx) — dann ist er transient und die Session bleibt.
      if (readRefreshToken(event) === undefined) {
        clearSessionCookies(event)
        return { authenticated: false, verified: true, profile: null, config }
      }
      return { authenticated: true, verified: false, profile, config }
    }

    // Der erzwungene Refresh wurde endgültig abgelehnt; Cookies sind bereits
    // gelöscht (sessionRefresh.ts).
    return { authenticated: false, verified: true, profile: null, config }
  }
})
