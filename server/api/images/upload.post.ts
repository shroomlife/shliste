/**
 * Signierender Proxy für den Rezeptbild-Upload (POST /sync/images/upload).
 *
 * Das Gegenstück zum Download-Proxy (`[...ref].get.ts`), aber mit den zwei
 * Besonderheiten des AI-Proxys: Der Body ist multipart/form-data und wird
 * deshalb als ROHE BYTES gelesen, gehasht und unverändert weitergereicht —
 * jede Umkodierung dazwischen würde die Binärdaten zerstören oder den
 * Body-Hash brechen. Der Content-Type wandert 1:1 mit, denn darin steckt die
 * Boundary, ohne die die API den Body nicht zerlegen kann.
 *
 * Anders als die AI-Routen verlangt die Upload-Route drüben zusätzlich zur
 * Signatur ein Konto (Bearer): Das Bild landet im Ordner des Nutzers und wird
 * über den Sync auf alle seine Geräte verteilt. Das JWT kommt wie überall aus
 * dem httpOnly-Cookie — der Browser sieht es nie.
 */
import { createHash, createHmac } from 'node:crypto'
import type { FetchResponse } from 'ofetch'
import { buildSignatureMessage } from '../../utils/apiSignature'
import { readSessionToken } from '../../utils/session'

export default defineEventHandler(async (event): Promise<unknown> => {
  // Ohne Session gar nicht erst signieren — die API würde ohnehin 401
  // antworten, aber ein Unangemeldeter soll diesen Server nicht als
  // Signaturquelle benutzen können (Begründung im Sync-Proxy).
  const sessionToken = readSessionToken(event)
  if (sessionToken === undefined) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  const { apiBase, appSecret } = useRuntimeConfig()

  // Fail fast wie im AI-Proxy: Ein leeres Secret erzeugt sonst still eine
  // Signatur, die die API mit 403 ablehnt — ein Fehlerbild, das nach
  // Signaturbug aussieht statt nach fehlender Konfiguration.
  if (!appSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server nicht konfiguriert',
      message: 'NUXT_APP_SECRET ist nicht gesetzt — ohne das Secret kann der Server keine Anfrage an api.shliste.app signieren.',
    })
  }

  // Grössen-Schranke VOR dem Puffern: `readRawBody` hält alles im Speicher,
  // die 5-MB-Grenze der API greift erst danach. 12 MB = grösstes legitimes
  // Paket (Bild plus multipart-Rahmen). Ohne Content-Length: 411 statt
  // unbegrenztem Stream.
  const declaredLength = Number(getHeader(event, 'content-length'))
  if (!Number.isFinite(declaredLength)) {
    throw createError({ statusCode: 411, statusMessage: 'Length Required' })
  }
  if (declaredLength > 12_000_000) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large' })
  }

  // `false` liefert den Buffer: exakt die Bytes, die der Browser gesendet hat.
  const rawBody = await readRawBody(event, false)
  const body: Buffer = rawBody ?? Buffer.alloc(0)

  // Signiert wird nur der pathname, nie ein Query-String (siehe apiSignature.ts).
  const url = new URL('/sync/images/upload', apiBase)
  const timestamp = Date.now()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const signature = createHmac('sha256', appSecret)
    .update(buildSignatureMessage('POST', url.pathname, timestamp, bodyHash), 'utf8')
    .digest('hex')

  const headers: Record<string, string> = {
    'x-auth-timestamp': String(timestamp),
    'x-auth-signature': signature,
    'x-auth-body-hash': bodyHash,
    'authorization': `Bearer ${sessionToken}`,
    'accept': 'application/json',
  }

  // Content-Type 1:1 durchreichen: Bei multipart steckt darin die Boundary.
  const contentType = getHeader(event, 'content-type')
  if (contentType !== undefined) {
    headers['content-type'] = contentType
  }

  // Besucher-IP für faire Rate-Limits pro Person statt pro BFF (s. apiFetch.ts).
  const clientIp = resolveVisitorIp(event)
  if (clientIp !== undefined) {
    headers['x-shliste-client-ip'] = clientIp
  }

  let response: FetchResponse<unknown>

  try {
    response = await $fetch.raw<unknown>(url.toString(), {
      method: 'POST',
      headers,
      body,
      // Statuscodes werden unten selbst durchgereicht: Auch ein 400 der API
      // trägt eine JSON-Fehlermeldung, die der Client anzeigen soll.
      ignoreResponseError: true,
      // Kein automatischer zweiter Versuch: Die Signatur trägt einen
      // Zeitstempel (±30s Fenster).
      retry: false,
    })
  }
  catch (cause) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'api.shliste.app ist nicht erreichbar.',
      cause,
    })
  }

  // Status und Nutzlast unverfälscht zurückgeben — die Auswertung gehört auf
  // die Client-Seite (app/ai/images.ts), wie beim AI-Proxy.
  setResponseStatus(event, response.status, response.statusText)
  return response._data ?? null
})
