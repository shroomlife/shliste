/**
 * Stiller Session-Refresh — „Will nicht auf einmal ausgeloggt sein."
 *
 * Das Session-JWT der API lebt eine Stunde. Damit der Nutzer davon nichts
 * merkt, tauscht die BFF es rechtzeitig gegen ein frisches, mit dem
 * Refresh-Token aus dem httpOnly-Cookie. Alle Routen, die einen Bearer an die
 * API schicken, holen sich ihr Token über `getFreshSessionToken()` statt das
 * Cookie roh zu lesen.
 *
 * DIE REUSE-SEMANTIK DER API, und warum dieser Code so vorsichtig ist:
 *
 * Refresh-Tokens ROTIEREN. `POST /auth/refresh` entwertet das eingereichte
 * Token und gibt ein neues aus. Wird ein bereits eingelöstes Token ein
 * zweites Mal eingereicht, wertet die API das als Diebstahl-Indiz
 * (`refresh_reuse_detected`) und widerruft die GESAMTE Session-Familie —
 * auch das gerade ausgegebene neue Token. Daraus folgen zwei eiserne Regeln:
 *
 * 1. NIEMALS einen Refresh-Request blind wiederholen. Ein Timeout heisst
 *    nicht „nicht angekommen": Der Request kann serverseitig durchgelaufen
 *    sein, das Token ist dann verbraucht — und die Wiederholung wäre genau
 *    der Doppel-Einsatz, der die Familie killt. Deshalb gibt es hier KEIN
 *    Retry; ein unklarer Ausgang wird als vorübergehend gemeldet und der
 *    nächste reguläre Aufruf versucht es (mit dem dann gültigen Cookie) neu.
 * 2. Refreshes MÜSSEN serialisiert sein (Single-Flight). Lädt der Browser
 *    fünf Ressourcen parallel und alle stellen fest „Token läuft gleich ab",
 *    dürfen daraus nicht fünf Refresh-Requests werden: Der erste gewönne,
 *    die übrigen vier wären Reuse. Alle gleichzeitigen Anfragen mit
 *    demselben Refresh-Token teilen sich deshalb EIN Promise.
 *
 * Fehlerdeutung, streng nach Herkunft:
 * - 401 von /auth/refresh (invalid_refresh_token, refresh_reuse_detected,
 *   session_revoked, refresh_expired) ist ENDGÜLTIG: beide Cookies löschen,
 *   der Nutzer meldet sich sichtbar neu an (SessionExpiredSheet).
 * - Netz-/5xx-Fehler sind TRANSIENT: Cookies unangetastet lassen und das
 *   alte Access-Token zurückgeben — vielleicht nimmt die API es noch, und
 *   falls nicht, ist deren 401 die ehrlichere Auskunft als ein vorschnelles
 *   lokales Abmelden.
 */
import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { apiFetch, isSessionExpiredError } from './apiFetch'
import { isRecord } from './guards'
import {
  clearSessionCookies,
  persistRefreshedTokens,
  readRefreshToken,
  readSessionToken,
  type RefreshGrant,
} from './session'
import { resolveVisitorIp } from './visitorIp'

/**
 * Ab dieser Restlaufzeit wird proaktiv refresht.
 *
 * 120 Sekunden decken die Laufzeit auch eines langsamen Requests samt
 * Uhren-Schlupf zwischen BFF und API ab: Ein Token, das hier noch zwei
 * Minuten gilt, kommt drüben nicht als abgelaufen an.
 */
const REFRESH_WINDOW_SECONDS = 120

/**
 * Liest den `exp`-Claim (Unix-Sekunden) aus einem JWT — OHNE Signaturprüfung.
 *
 * Das ist hier ausdrücklich in Ordnung: Die BFF kennt das JWT_SECRET nicht
 * und KANN nicht verifizieren; verbindlich prüft allein die API. `exp` wird
 * nur als Heuristik gelesen („lohnt jetzt ein Refresh?"), und ein gefälschtes
 * `exp` verschafft niemandem etwas — die API lehnt ein kaputtes Token ohnehin
 * ab. Unlesbares ergibt `null`, nie eine Exception.
 */
export function readJwtExpiry(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const payloadPart = parts[1]
  if (payloadPart === undefined || payloadPart.length === 0) return null

  try {
    const payload: unknown = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
    if (!isRecord(payload)) return null

    const { exp } = payload
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
  }
  catch {
    return null
  }
}

/**
 * Single-Flight: gleichzeitige Aufrufe mit demselben Schlüssel teilen sich
 * EINE Ausführung von `task`.
 *
 * Der Eintrag wird im `finally` geräumt — erst wenn das Ergebnis feststeht,
 * darf ein späterer Aufruf eine neue Ausführung starten. Ein synchroner Wurf
 * von `task` landet nie in der Map und kann sie deshalb nicht verstopfen.
 *
 * Als eigenständige, reine Funktion exportiert, damit sie ohne Nitro-Kontext
 * testbar ist (server/tests/sessionRefresh.test.ts).
 */
export function runSingleFlight<T>(
  inflight: Map<string, Promise<T>>,
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key)
  if (existing !== undefined) return existing

  const pending = task().finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, pending)
  return pending
}

/**
 * Ausgang eines Refresh-Versuchs bei der API.
 *
 * - `refreshed`   — neues Token-Paar; Cookies müssen rotiert werden.
 * - `revoked`     — die API hat den Refresh ENDGÜLTIG abgelehnt (401).
 * - `unavailable` — kein verwertbares Ergebnis (Netz, 5xx, kaputte Antwort);
 *                   sagt NICHTS über die Session aus.
 */
type RefreshOutcome
  = | { kind: 'refreshed', sessionToken: string, refresh: RefreshGrant }
    | { kind: 'revoked' }
    | { kind: 'unavailable' }

/**
 * Schlüssel: sha256 des Refresh-Tokens — das Token selbst liegt nie in der Map.
 * Auf Modulebene, damit ALLE parallel laufenden Requests desselben Prozesses
 * sich dieselbe Flight teilen (siehe Reuse-Semantik oben).
 */
const inflightRefreshes = new Map<string, Promise<RefreshOutcome>>()

/**
 * Ein einzelner Refresh bei der API — genau EIN Request, kein Retry (Regel 1).
 *
 * Nur HMAC-signiert, kein Bearer: `/auth/refresh` authentifiziert über das
 * Refresh-Token im Body, nicht über das (womöglich abgelaufene) JWT.
 */
async function exchangeRefreshToken(
  refreshToken: string,
  clientIp: string | undefined,
): Promise<RefreshOutcome> {
  let payload: unknown

  try {
    payload = await apiFetch('/auth/refresh', {
      method: 'POST',
      rawBody: JSON.stringify({ refreshToken }),
      clientIp,
    })
  }
  catch (error) {
    // Nur ein 401 der API ist ein Urteil über das Refresh-Token
    // (invalid_refresh_token | refresh_reuse_detected | session_revoked |
    // refresh_expired). Alles andere — 403 (Signatur/Uhr), 429, 5xx, 502
    // aus apiFetch bei Netzproblemen — ist ein Transportproblem und darf
    // NICHT als „abgelaufen" gedeutet werden.
    if (isSessionExpiredError(error)) return { kind: 'revoked' }

    console.warn(
      '[sessionRefresh] Refresh nicht möglich (transient):',
      error instanceof Error ? error.message : error,
    )
    return { kind: 'unavailable' }
  }

  const parsed = parseRefreshResponse(payload)
  if (parsed === null) {
    // Eine 200-Antwort in unerwarteter Form ist ein Problem der Gegenseite,
    // kein Urteil über die Session — wie ein 5xx behandeln.
    console.warn('[sessionRefresh] Unerwartete Antwort von /auth/refresh.')
    return { kind: 'unavailable' }
  }

  return parsed
}

/** Engt die 200-Antwort von POST /auth/refresh ein. */
function parseRefreshResponse(payload: unknown): RefreshOutcome | null {
  if (!isRecord(payload)) return null

  const { sessionToken, refreshToken, refreshExpiresIn } = payload
  if (typeof sessionToken !== 'string' || sessionToken.length === 0) return null
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) return null
  if (typeof refreshExpiresIn !== 'number' || !(refreshExpiresIn > 0)) return null

  return {
    kind: 'refreshed',
    sessionToken,
    refresh: { refreshToken, refreshExpiresIn },
  }
}

export interface SessionTokenResult {
  /** Verwendbares Session-JWT, oder null wenn gerade keines zu haben ist. */
  sessionToken: string | null
  /**
   * true: Die API hat den Refresh ENDGÜLTIG abgelehnt; die Cookies sind
   * bereits gelöscht. `null` ohne dieses Flag heisst dagegen nur „im Moment
   * kein Token beschaffbar" (nie angemeldet oder API nicht erreichbar) —
   * dann ist NICHTS gelöscht worden.
   */
  refreshDenied: boolean
}

export interface FreshTokenOptions {
  /**
   * Erzwingt den Refresh unabhängig von der Restlaufzeit — für den genau
   * einen Wiederholungsversuch, nachdem die API trotz rechnerisch gültigem
   * Token 401 geantwortet hat (z.B. serverseitig widerrufene Session oder
   * rotiertes JWT_SECRET).
   */
  force?: boolean
}

/**
 * Beschafft das Session-JWT für einen API-Aufruf und refresht bei Bedarf still.
 *
 * Ablauf:
 * 1. Kein Refresh-Cookie (Legacy-Session oder abgemeldet): das Access-Cookie
 *    unverändert zurückgeben — es gibt nichts zu erneuern.
 * 2. Access-Token hat laut `exp` noch ≥ 120 s (und kein `force`): unverändert
 *    zurückgeben. Unlesbares `exp` ebenso — verbindlich prüft die API.
 * 3. Sonst: Refresh über die Single-Flight (Reuse-Semantik im Kopf der Datei).
 *    - Erfolg   → beide Cookies rotieren, neues Token zurück.
 *    - 401      → endgültig: beide Cookies löschen, `refreshDenied: true`.
 *    - Netz/5xx → Cookies NICHT anfassen, KEIN Retry; das alte Token zurück
 *                 (vielleicht nimmt die API es noch).
 */
export async function resolveSessionToken(
  event: H3Event,
  options: FreshTokenOptions = {},
): Promise<SessionTokenResult> {
  const sessionToken = readSessionToken(event) ?? null
  const refreshToken = readRefreshToken(event)

  // Schritt 1: Legacy oder abgemeldet — ohne Refresh-Token ist das
  // vorhandene (oder fehlende) Access-Token die ganze Wahrheit.
  if (refreshToken === undefined) {
    return { sessionToken, refreshDenied: false }
  }

  // Schritt 2: Restlaufzeit reicht — kein Grund, das Refresh-Token
  // anzufassen. Ein fehlendes Access-Cookie zählt als „abgelaufen" und fällt
  // in den Refresh durch: So heilt sich auch der halbe Zustand
  // „Refresh-Cookie ohne Access-Cookie" von selbst.
  if (sessionToken !== null && options.force !== true) {
    const exp = readJwtExpiry(sessionToken)
    if (exp === null) return { sessionToken, refreshDenied: false }

    const remainingSeconds = exp - Date.now() / 1000
    if (remainingSeconds >= REFRESH_WINDOW_SECONDS) {
      return { sessionToken, refreshDenied: false }
    }
  }

  // Schritt 3: Refresh — serialisiert über die Single-Flight. Parallele
  // Requests desselben Nutzers warten auf DENSELBEN Austausch und wenden
  // dessen Ergebnis anschliessend jeweils auf ihre eigene Antwort an
  // (Set-Cookie ist idempotent).
  const flightKey = createHash('sha256').update(refreshToken).digest('hex')
  const outcome = await runSingleFlight(inflightRefreshes, flightKey, () =>
    exchangeRefreshToken(refreshToken, resolveVisitorIp(event)))

  switch (outcome.kind) {
    case 'refreshed':
      persistRefreshedTokens(event, outcome.sessionToken, outcome.refresh)
      return { sessionToken: outcome.sessionToken, refreshDenied: false }

    case 'revoked':
      // Endgültig: Ohne gültiges Refresh-Token ist die Session-Familie tot.
      // Cookies räumen, damit die Oberfläche ehrlich „abgemeldet" zeigt und
      // nicht Request für Request in denselben 401 läuft.
      clearSessionCookies(event)
      return { sessionToken: null, refreshDenied: true }

    case 'unavailable':
      // Transient: nichts löschen, nichts wiederholen. Das alte Token darf
      // die API gern selbst beurteilen.
      return { sessionToken, refreshDenied: false }
  }
}

/**
 * Bequemer Zugriff für die Proxy-Routen: nur das Token, oder null.
 *
 * `null` heisst für den Aufrufer schlicht „401 Nicht angemeldet" — ob nie
 * angemeldet oder endgültig widerrufen, macht für eine Proxy-Antwort keinen
 * Unterschied. Wer es unterscheiden muss (auth/me), nimmt `resolveSessionToken`.
 */
export async function getFreshSessionToken(
  event: H3Event,
  options: FreshTokenOptions = {},
): Promise<string | null> {
  const { sessionToken } = await resolveSessionToken(event, options)
  return sessionToken
}
