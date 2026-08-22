import { createHash } from 'node:crypto'
import { apiFetch, isSessionExpiredError } from './apiFetch'
import { readJwtExpiry } from './sessionRefresh'

/**
 * Prüft, ob ein Session-JWT bei der API tatsächlich noch gilt.
 *
 * WOZU: Das Cookie allein beweist nichts — `readSessionToken` liefert den
 * rohen Wert, und den kann jeder HTTP-Client frei erfinden. Für die
 * Sync-Routen ist das egal (die API prüft den Bearer selbst), die AI-Routen
 * tragen aber bewusst keinen Bearer. Ohne diese Prüfung wäre der AI-Proxy
 * ein anonym nutzbarer Zugang zu kostenpflichtigen OpenAI-Aufrufen.
 *
 * Verifizieren kann das JWT nur die API (nur sie kennt das Secret), deshalb
 * fragt diese Funktion GET /sync/session — eine Route, die nichts tut ausser
 * den userAuth-Guard zu durchlaufen.
 *
 * DREIWERTIG, nicht boolesch: Nur ein echtes 401 der API ist ein Urteil über
 * die Session (`invalid`). Netzfehler, 5xx und 429 sagen über die Session
 * NICHTS aus (`unknown`) — der Aufrufer soll dem Nutzer dann „Dienst gerade
 * nicht erreichbar" sagen statt fälschlich „Sitzung abgelaufen". Genau diese
 * Verwechslung hat vorher Nutzer scheinbar ausgeloggt, obwohl nur die API
 * kurz weg war.
 */
export type SessionCheckResult = 'valid' | 'invalid' | 'unknown'

/**
 * Positive Antworten werden kurz gemerkt, damit nicht jeder AI-Aufruf einen
 * zweiten Roundtrip kostet; negative bewusst nicht, denn ein frisch
 * eingeloggter Nutzer soll nicht minutenlang auf ein gemerktes „ungültig"
 * laufen.
 */
const VALID_TTL_MS = 5 * 60_000

/** SHA-256 des Tokens als Schlüssel — das JWT selbst liegt nie in der Map. */
const validUntilByTokenHash = new Map<string, number>()

function pruneExpired(now: number): void {
  for (const [key, until] of validUntilByTokenHash) {
    if (until <= now) validUntilByTokenHash.delete(key)
  }
}

export async function checkSession(sessionToken: string, clientIp?: string): Promise<SessionCheckResult> {
  const key = createHash('sha256').update(sessionToken).digest('hex')
  const now = Date.now()

  const cachedUntil = validUntilByTokenHash.get(key)
  if (cachedUntil !== undefined && cachedUntil > now) return 'valid'

  try {
    await apiFetch('/sync/session', { sessionToken, clientIp })
  }
  catch (error) {
    return isSessionExpiredError(error) ? 'invalid' : 'unknown'
  }

  if (validUntilByTokenHash.size > 5000) pruneExpired(now)

  // Der Positiv-Cache endet spätestens mit dem `exp` des JWT: Ein Token, das
  // in 30 Sekunden abläuft, darf nicht fünf Minuten lang als gültig gelten —
  // sonst signierte diese Schicht Aufrufe, die die API längst ablehnen würde.
  // (`exp` unsigniert zu lesen ist hier unbedenklich, siehe readJwtExpiry.)
  const exp = readJwtExpiry(sessionToken)
  const cacheUntil = exp === null ? now + VALID_TTL_MS : Math.min(now + VALID_TTL_MS, exp * 1000)
  if (cacheUntil > now) validUntilByTokenHash.set(key, cacheUntil)

  return 'valid'
}
