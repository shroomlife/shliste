/**
 * Signierender Proxy zu den AI-Routen der API.
 *
 * Gleiche Grundhaltung wie der Sync-Proxy (server/api/sync/[...path].ts):
 * eine Allowlist statt eines Catch-alls, denn diese Route hat Zugriff auf das
 * APP_SECRET und wäre sonst ein öffentlicher Signier-Dienst.
 *
 * Zwei Unterschiede zum Sync-Proxy, beide begründet:
 *
 * 1. Die AI-Routen kennen keinen Bearer — die API bindet AI-Aufrufe nicht an
 *    ein Konto. Die Session wird hier TROTZDEM verlangt: Jeder Aufruf kostet
 *    drüben OpenAI-Budget, und ein anonym nutzbarer Proxy würde dieses Budget
 *    für jeden Besucher des Internets öffnen.
 * 2. Der Body wird als ROHE BYTES gelesen und weitergereicht, nicht als
 *    UTF-8-String. Die Voice- und Bild-Routen senden multipart/form-data,
 *    und Binärdaten überleben einen Umweg über einen String nicht. Der
 *    Body-Hash entsteht deshalb direkt über dem Buffer — bei multipart prüft
 *    die API ihn nicht nach, er muss aber vorhanden und mitsigniert sein.
 */
import { createHash, createHmac } from 'node:crypto'
import type { FetchResponse } from 'ofetch'
import { buildSignatureMessage } from '../../utils/apiSignature'
import { getFreshSessionToken } from '../../utils/sessionRefresh'
import { checkSession } from '../../utils/sessionCheck'

/**
 * Obergrenzen für den gepufferten Body, VOR dem Lesen geprüft.
 *
 * `readRawBody` hält den kompletten Body im Speicher; die 5/10-MB-Grenzen der
 * API greifen erst NACH dem Puffern hier. Ohne eigene Schranke wäre diese
 * Route ein billiger Speicherhebel. 12 MB deckt das größte legitime Paket
 * (10-MB-Bild plus multipart-Rahmen), JSON-Anfragen sind winzig.
 */
const MAX_JSON_BODY_BYTES = 1_000_000
const MAX_MULTIPART_BODY_BYTES = 12_000_000

/**
 * Die AI-Routen, die diese PWA tatsächlich aufruft — alle POST.
 */
const ALLOWED_AI_ROUTES: ReadonlySet<string> = new Set([
  'suggest',
  'edit-list',
  'voice-edit-list',
  'voice-to-list',
  'url-to-list',
  'image-to-list',
  'voice-to-recipe',
  'url-to-recipe',
  'image-to-recipe',
  'edit-recipe',
  'voice-edit-recipe',
  'recipe-chat',
  'voice-recipe-chat',
  'explain-step',
  'recipe-to-image',
])

export default defineEventHandler(async (event): Promise<unknown> => {
  // Zuerst die Allowlist, erst danach die Session — was diese Schicht nicht
  // anbietet, existiert für jeden Aufrufer gleichermaßen nicht (Begründung
  // im Sync-Proxy).
  const path = getRouterParam(event, 'path') ?? ''
  if (!ALLOWED_AI_ROUTES.has(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Ohne Session gar nicht erst signieren: AI-Aufrufe kosten Budget, und ein
  // Unangemeldeter soll diesen Server nicht als Signaturquelle benutzen können.
  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  // Größen-Schranke VOR dem Puffern (Begründung an den Konstanten). Browser
  // senden Content-Length immer; wer ihn weglässt, bekommt 411 statt eines
  // unbegrenzten Streams.
  const incomingContentType = getHeader(event, 'content-type') ?? ''
  const isMultipart = incomingContentType.includes('multipart/form-data')
  const bodyLimit = isMultipart ? MAX_MULTIPART_BODY_BYTES : MAX_JSON_BODY_BYTES
  const declaredLength = Number(getHeader(event, 'content-length'))
  if (!Number.isFinite(declaredLength)) {
    throw createError({ statusCode: 411, statusMessage: 'Length Required' })
  }
  if (declaredLength > bodyLimit) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large' })
  }

  // Die eigentliche Prüfung des Cookies: Der rohe Wert beweist nichts, ein
  // beliebiger HTTP-Client kann ihn erfinden. Ob die Sitzung GILT, weiß nur
  // die API — kurz gecacht, damit nicht jeder AI-Aufruf doppelt kostet.
  //
  // DREIWERTIG (Audit W1): Nur ein echtes 401 der API heißt „Sitzung
  // abgelaufen". Ist die API gerade nicht erreichbar (Netz, 5xx, 429), ist
  // die Anmeldung des Nutzers völlig in Ordnung — dann 503 statt eines
  // falschen 401, das die Oberfläche als „ausgeloggt" deuten würde. Fail
  // closed bleibt es trotzdem: Ohne bestätigte Sitzung wird kein
  // kostenpflichtiger OpenAI-Aufruf signiert.
  const sessionState = await checkSession(sessionToken, resolveVisitorIp(event))
  if (sessionState === 'invalid') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Sitzung abgelaufen.' })
  }
  if (sessionState === 'unknown') {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Der Dienst ist gerade nicht erreichbar — deine Anmeldung ist in Ordnung.',
    })
  }

  const { apiBase, appSecret } = useRuntimeConfig()

  // Fail fast wie in apiSignature.ts: Ein leeres Secret erzeugt sonst still
  // eine Signatur, die die API mit 403 ablehnt — ein Fehlerbild, das nach
  // Signaturbug aussieht statt nach fehlender Konfiguration.
  if (!appSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server nicht konfiguriert',
      message: 'NUXT_APP_SECRET ist nicht gesetzt — ohne das Secret kann der Server keine Anfrage an api.shliste.app signieren.',
    })
  }

  // `false` liefert den Buffer: exakt die Bytes, die der Browser gesendet hat.
  // Genau diese Bytes werden gehasht UND weitergesendet — jede Umkodierung
  // dazwischen würde multipart-Inhalte zerstören oder den Hash brechen.
  const rawBody = await readRawBody(event, false)
  const body: Buffer = rawBody ?? Buffer.alloc(0)

  // Signiert wird nur der pathname, nie ein Query-String (siehe apiSignature.ts).
  const url = new URL(`/ai/${path}`, apiBase)
  const timestamp = Date.now()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const signature = createHmac('sha256', appSecret)
    .update(buildSignatureMessage('POST', url.pathname, timestamp, bodyHash), 'utf8')
    .digest('hex')

  const headers: Record<string, string> = {
    'x-auth-timestamp': String(timestamp),
    'x-auth-signature': signature,
    'x-auth-body-hash': bodyHash,
    'accept': 'application/json',
  }

  // Content-Type 1:1 durchreichen: Bei multipart steckt darin die Boundary,
  // ohne die die API den Body nicht zerlegen kann.
  if (incomingContentType !== '') {
    headers['content-type'] = incomingContentType
  }

  // Besucher-IP für faire Rate-Limits pro Person statt pro BFF. Die API
  // vertraut dem Header nur zusammen mit einer gültigen Signatur (siehe apiFetch.ts).
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
      // Zeitstempel (±30s Fenster), und ein wiederholter AI-Aufruf würde
      // doppeltes Budget kosten.
      retry: false,
    })
  }
  catch (cause) {
    // Hier landet nur, was gar nicht erst zu einer Antwort geführt hat (DNS,
    // Verbindungsabbruch, TLS) — ein Problem des Upstreams, deshalb 502.
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'api.shliste.app ist nicht erreichbar.',
      cause,
    })
  }

  // Status und Nutzlast unverfälscht zurückgeben. Kein createError bei !ok:
  // /ai/suggest liefert Fehler sogar mit HTTP 200 im Feld `error`, die
  // Auswertung gehört deshalb komplett auf die Client-Seite (app/ai/transport.ts).
  setResponseStatus(event, response.status, response.statusText)
  return response._data ?? null
})
