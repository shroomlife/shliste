/**
 * Signierender Proxy zu den Sync-Routen der API.
 *
 * WARUM EINE ALLOWLIST UND KEIN CATCH-ALL:
 * Diese Route hat Zugriff auf das APP_SECRET. Würde sie jeden Pfad
 * weiterreichen, wäre sie ein öffentlicher Signier-Dienst: jeder Besucher
 * könnte sich über diesen Server beliebige Anfragen an api.shliste.app
 * signieren lassen — auch an Routen, die diese App nie braucht, und mit
 * Methoden, für die sie nie gedacht war. Das Secret bliebe geheim und wäre
 * trotzdem wirkungslos, weil seine einzige Aufgabe (nur echte Clients kommen
 * durch) ausgehebelt wäre.
 *
 * Erlaubt ist deshalb ausschliesslich, was die PWA tatsächlich aufruft, und
 * zwar als Paar aus Pfad UND Methode. Alles andere: 404 — nicht 403, denn was
 * diese Schicht nicht anbietet, existiert für den Aufrufer schlicht nicht.
 *
 * Der Query-String wird unverändert durchgereicht; er geht laut Protokoll nicht
 * in die Signatur ein (siehe apiSignature.ts).
 */
import type { ApiMethod } from '../../utils/apiFetch'
import { apiFetch, isSessionExpiredError } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

/**
 * Feste Paare aus Methode und Pfad (Pfad relativ zu `/sync`).
 * Ein Set statt einer Liste: der Abgleich ist ein exakter Treffer, kein Muster.
 */
const ALLOWED_ROUTES: ReadonlySet<string> = new Set([
  'GET /status',
  'GET /pull',
  'GET /pull/delta',
  'POST /push',
  'POST /migrate',
  'POST /realtime/ticket',
  'GET /members/contacts',
  'POST /members/add',
  'POST /members/remove',
  'POST /members/remove-invite',
  'POST /members/accept',
  'POST /members/decline',
])

/**
 * Einziger Eintrag mit einem Parameter: GET /members/:listId.
 *
 * Die Id muss eine UUID sein. Das hält die Route eng und trennt sie sauber von
 * `/members/contacts`, das die API als eigene, statische Route führt — ein
 * offenes `[^/]+` würde beide Fälle vermischen.
 */
const MEMBERS_OF_LIST = /^\/members\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isAllowed(method: ApiMethod, path: string): boolean {
  if (ALLOWED_ROUTES.has(`${method} ${path}`)) return true
  return method === 'GET' && MEMBERS_OF_LIST.test(path)
}

export default defineEventHandler(async (event): Promise<unknown> => {
  // Zuerst die Allowlist, erst danach die Session: was diese Schicht nicht
  // anbietet, existiert für jeden Aufrufer gleichermassen nicht. Ein 401 an
  // dieser Stelle würde verraten, dass es den Pfad gäbe, wenn man nur angemeldet wäre.
  const method = event.method
  if (method !== 'GET' && method !== 'POST') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Nicht dekodiert: der Wert wird nur gegen die Allowlist gehalten. Was dort
  // nicht exakt passt — auch prozentkodierte Tricks wie %2e%2e — fällt durch.
  const path = `/${getRouterParam(event, 'path') ?? ''}`
  if (!isAllowed(method, path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Ohne Session gar nicht erst signieren. Die API würde ohnehin 401 antworten,
  // aber ein Unangemeldeter soll diesen Server nicht als Signaturquelle benutzen
  // können. `getFreshSessionToken` erneuert dabei ein (fast) abgelaufenes JWT
  // still über das Refresh-Cookie (siehe sessionRefresh.ts).
  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  // Body byteweise weiterreichen statt zu parsen und neu zu serialisieren:
  // der gesendete String muss exakt der sein, über den der Body-Hash gebildet
  // wurde, sonst lehnt die API mit 403 ab.
  const rawBody = method === 'POST' ? await readRawBody(event, 'utf8') : undefined

  const upstreamPath = `/sync${path}${queryString(event.path)}`
  // Besucher-IP für faire Rate-Limits pro Person statt pro BFF (s. apiFetch).
  const clientIp = resolveVisitorIp(event)

  try {
    return await apiFetch(upstreamPath, { method, rawBody, sessionToken, clientIp })
  }
  catch (error) {
    // 401 trotz frischem Token: Die Session wurde serverseitig entwertet
    // (Widerruf, rotiertes JWT_SECRET) — genau EIN erzwungener Refresh und
    // genau EIN Wiederholungsversuch. Die Wiederholung ist sicher: Der 401
    // kommt aus dem Auth-Guard der API, VOR jeder Verarbeitung — auch ein
    // /sync/push hat also nichts geschrieben. Die Refresh-Disziplin (kein
    // blindes Retry, Single-Flight) steckt in sessionRefresh.ts.
    if (!isSessionExpiredError(error)) throw error

    const retryToken = await getFreshSessionToken(event, { force: true })
    // Nur mit einem NEUEN Token lohnt die Wiederholung: Dasselbe Token würde
    // denselben 401 ernten, und ohne Token (Refresh endgültig abgelehnt oder
    // Legacy ohne Refresh-Cookie) ist der 401 die richtige Antwort.
    if (retryToken === null || retryToken === sessionToken) throw error

    return await apiFetch(upstreamPath, { method, rawBody, sessionToken: retryToken, clientIp })
  }
})

/** Der Query-String der eingehenden Anfrage, inklusive '?', sonst ''. */
function queryString(requestPath: string): string {
  const start = requestPath.indexOf('?')
  return start === -1 ? '' : requestPath.slice(start)
}
