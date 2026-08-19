/**
 * Der einzige Weg von dieser App zu api.shliste.app.
 *
 * Signiert jede Anfrage (HMAC, siehe apiSignature.ts), hängt bei Bedarf das
 * Session-JWT an und reicht den Fehlerstatus der API unverfälscht durch.
 * Kein anderer Server-Code spricht die API direkt an — sonst gäbe es einen
 * zweiten Ort, an dem das Secret gelesen und die Signatur gebaut wird.
 */
import type { FetchResponse } from 'ofetch'
import { signRequest } from './apiSignature'

/** Mehr braucht die BFF nicht: alle erlaubten Routen sind GET oder POST. */
export type ApiMethod = 'GET' | 'POST'

export interface ApiFetchOptions {
  method?: ApiMethod
  /**
   * Bereits serialisierter Body. Genau dieser String wird gehasht UND gesendet —
   * ein Objekt entgegenzunehmen und hier zu serialisieren würde die Bytes
   * zwischen Hash und Übertragung auseinanderlaufen lassen.
   */
  rawBody?: string
  /**
   * Session-JWT der API. Stammt immer aus dem httpOnly-Cookie, niemals aus
   * einem Feld, das der Browser frei setzen kann.
   */
  sessionToken?: string
}

/**
 * Ruft die API auf und gibt die Antwort als `unknown` zurück.
 *
 * Bewusst `unknown` statt eines generischen Parameters: die Antwort ist fremdes
 * JSON und damit unbewiesen. Wer ein Feld braucht, engt sie beim Aufrufer ein.
 *
 * @param path Pfad ab dem Wurzelverzeichnis der API, Query-String erlaubt
 *             (z.B. `/sync/pull?since=...`).
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<unknown> {
  const { method = 'GET', rawBody, sessionToken } = options
  const { apiBase } = useRuntimeConfig()

  // Die URL ist die einzige Quelle für den zu signierenden Pfad: `url.pathname`
  // ist exakt das, was die API auf ihrer Seite aus `new URL(request.url)` liest.
  // Ein eventuell mitgegebener Query-String landet in `url.search` und bleibt
  // damit automatisch aus der Signatur heraus.
  const url = new URL(path, apiBase)

  const headers: Record<string, string> = {
    ...signRequest(method, url.pathname, rawBody),
    // Sync-Protokollversion (RFC 6648: kein X-Präfix). Die API liest den Header
    // in ihrem Sync-Plugin und fällt sonst auf 1 zurück — explizit ist besser.
    'sync-version': '1',
    'accept': 'application/json',
  }

  if (rawBody !== undefined) {
    headers['content-type'] = 'application/json'
  }

  if (sessionToken !== undefined) {
    headers['authorization'] = `Bearer ${sessionToken}`
  }

  let response: FetchResponse<unknown>

  try {
    response = await $fetch.raw<unknown>(url.toString(), {
      method,
      headers,
      body: rawBody,
      // Statuscodes werden unten selbst ausgewertet, damit ein 401 der API als
      // 401 beim Client ankommt und nicht als geworfener Fetch-Fehler im 500 endet.
      ignoreResponseError: true,
      // Kein automatischer zweiter Versuch: die Signatur trägt einen Zeitstempel
      // (±30s Fenster) und ein wiederholtes /sync/push wäre ein doppelter Schreibvorgang.
      retry: false,
    })
  }
  catch (cause) {
    // Hier landet nur, was gar nicht erst zu einer Antwort geführt hat: DNS,
    // Verbindungsabbruch, TLS. Das ist ein Problem des Upstreams, kein Fehler
    // dieser App — deshalb 502 und nicht 500.
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'api.shliste.app ist nicht erreichbar.',
      cause,
    })
  }

  if (!response.ok) {
    // Status, Meldung und Nutzlast der API unverändert weiterreichen. Der Client
    // unterscheidet 401 (Session abgelaufen) von 403 (Signatur/Uhrzeit) und
    // 429 (Rate-Limit) — diese Information darf unterwegs nicht verloren gehen.
    throw createError({
      statusCode: response.status,
      statusMessage: response.statusText,
      data: response._data,
    })
  }

  return response._data
}

/** Wahr, wenn die API die Session abgelehnt hat (abgelaufenes oder ungültiges JWT). */
export function isSessionExpiredError(error: unknown): boolean {
  return isError(error) && error.statusCode === 401
}
