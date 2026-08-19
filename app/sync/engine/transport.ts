/**
 * Der Weg vom Browser zur Sync-API.
 *
 * IMMER ÜBER DIE EIGENE BFF, NIE DIREKT ZU api.shliste.app: Jede Anfrage an
 * die API muss mit dem APP_SECRET signiert sein, und dieses Geheimnis liegt
 * ausschliesslich im Nitro-Server (siehe `nuxt.config.ts`, `runtimeConfig`).
 * Der Browser kennt es nicht und darf es nie kennen. `server/api/sync/
 * [...path].ts` signiert und hängt das Session-JWT aus dem httpOnly-Cookie an
 * — deshalb braucht diese Datei weder Token noch Header dafür.
 *
 * WARUM `fetch` UND NICHT `$fetch`: `$fetch` wirft bei Fehlern einen
 * `FetchError` und versteckt Statuscode und Antwort-Header hinter dessen
 * Struktur. Der Abgleich braucht aber beides unverfälscht — den Status für die
 * Fehlerklassifizierung und `Retry-After` für das Rate-Limit.
 */
import { SyncError, classifyHttpStatus, parseRetryAfter, toSyncError } from './errors'
import { isRecord } from './json'

/**
 * Alle Endpunkte an einer Stelle. Die Sync-Pfade müssen exakt in der
 * Allowlist von `server/api/sync/[...path].ts` stehen, sonst antwortet die
 * BFF mit 404 statt weiterzureichen.
 */
export const SYNC_ENDPOINTS = {
  session: '/api/auth/me',
  status: '/api/sync/status',
  pull: '/api/sync/pull',
  /** Gezielter Abruf einer Liste, einzelner Positionen oder eines Rezepts. */
  delta: '/api/sync/pull/delta',
  push: '/api/sync/push',
  migrate: '/api/sync/migrate',
} as const

/**
 * Die Signatur von `fetch`, so weit die Engine sie braucht.
 *
 * Als Parameter durchgereicht statt global benutzt, damit die Tests ohne Netz
 * laufen: Ein globales `fetch` liesse sich nur durch Monkey-Patching ersetzen,
 * und das wirkt auf alle parallel laufenden Tests.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface RequestOptions {
  method?: 'GET' | 'POST'
  /** Wird hier serialisiert. Die BFF reicht die Bytes unverändert weiter. */
  body?: unknown
  signal?: AbortSignal
  fetchImpl?: FetchLike
}

/**
 * `fetch` ist an das globale Objekt gebunden. Eine freistehende Referenz
 * darauf wirft in manchen Browsern "Illegal invocation" — deshalb der
 * Wrapper statt `fetchImpl = fetch`.
 */
const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init)

/**
 * Ruft die BFF auf und gibt die Antwort als `unknown` zurück.
 *
 * Bewusst `unknown` und kein generischer Parameter: Die Antwort ist fremdes
 * JSON und damit unbewiesen. Wer ein Feld braucht, engt sie beim Aufrufer ein
 * (siehe `parsePullResponse` und `parsePushResponse`).
 */
export async function requestJson(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = 'GET', body, signal, fetchImpl = defaultFetch } = options

  const headers: Record<string, string> = { accept: 'application/json' }
  const hasBody = body !== undefined
  if (hasBody) {
    headers['content-type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetchImpl(path, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      // Ausdrücklich statt implizit: Ohne die Cookies ist jede Anfrage ein
      // 401, und der Standardwert von `credentials` ist nichts, worauf man
      // sich über Browser-Generationen hinweg verlassen sollte.
      credentials: 'same-origin',
      signal,
    })
  }
  catch (cause) {
    // Hier landet nur, was nie zu einer Antwort geführt hat.
    throw toSyncError(cause)
  }

  if (!response.ok) {
    throw await errorFromResponse(response)
  }

  // 204 hat definitionsgemäss keinen Rumpf; `json()` würde daran scheitern.
  if (response.status === 204) {
    return null
  }

  try {
    const data: unknown = await response.json()
    return data
  }
  catch (cause) {
    throw new SyncError('Die Antwort des Servers war kein gültiges JSON.', {
      kind: 'transient',
      status: response.status,
      cause,
    })
  }
}

/** Baut den passenden `SyncError` zu einer abgelehnten Antwort. */
async function errorFromResponse(response: Response): Promise<SyncError> {
  const kind = classifyHttpStatus(response.status)
  const retryAfterMs = kind === 'rateLimited'
    ? parseRetryAfter(response.headers.get('retry-after'))
    : null

  return new SyncError(await readErrorMessage(response), {
    kind,
    status: response.status,
    ...(retryAfterMs === null ? {} : { retryAfterMs }),
  })
}

/**
 * Liest die Fehlermeldung aus dem Rumpf.
 *
 * Zwei Formen sind möglich: Die API antwortet mit `{ error: "..." }`, Nitro
 * verpackt weitergereichte Fehler zusätzlich in `{ statusMessage, message,
 * data }`. Beide werden abgeklopft, sonst stünde in der Oberfläche nur eine
 * nackte Zahl.
 *
 * Scheitert das Lesen, bleibt es beim Statustext — ein Fehler beim Auswerten
 * eines Fehlers darf den Fehler nicht ersetzen.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `${response.status} ${response.statusText}`.trim()

  try {
    const payload: unknown = await response.json()
    return extractMessage(payload) ?? fallback
  }
  catch {
    return fallback
  }
}

function extractMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null

  const nested = extractMessage(payload['data'])
  if (nested !== null) return nested

  for (const key of ['error', 'message', 'statusMessage']) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim() !== '') return value
  }

  return null
}
