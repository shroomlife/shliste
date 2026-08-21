import { createHash } from 'node:crypto'
import { apiFetch } from './apiFetch'

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
 * den userAuth-Guard zu durchlaufen. Positive Antworten werden kurz
 * gemerkt, damit nicht jeder AI-Aufruf einen zweiten Roundtrip kostet;
 * negative bewusst nicht, denn ein frisch eingeloggter Nutzer soll nicht
 * minutenlang auf ein gemerktes "ungültig" laufen.
 */
const VALID_TTL_MS = 5 * 60_000

/** SHA-256 des Tokens als Schlüssel — das JWT selbst liegt nie in der Map. */
const validUntilByTokenHash = new Map<string, number>()

function pruneExpired(now: number): void {
  for (const [key, until] of validUntilByTokenHash) {
    if (until <= now) validUntilByTokenHash.delete(key)
  }
}

export async function isSessionValid(sessionToken: string, clientIp?: string): Promise<boolean> {
  const key = createHash('sha256').update(sessionToken).digest('hex')
  const now = Date.now()

  const cachedUntil = validUntilByTokenHash.get(key)
  if (cachedUntil !== undefined && cachedUntil > now) return true

  try {
    await apiFetch('/sync/session', { sessionToken, clientIp })
  }
  catch {
    // 401 heisst abgelaufen; jeder andere Fehler (API nicht erreichbar, 429)
    // heisst ebenfalls: jetzt keinen kostenpflichtigen Aufruf signieren.
    // Fail closed — der nachfolgende AI-Aufruf würde ohnehin scheitern.
    return false
  }

  if (validUntilByTokenHash.size > 5000) pruneExpired(now)
  validUntilByTokenHash.set(key, now + VALID_TTL_MS)
  return true
}
