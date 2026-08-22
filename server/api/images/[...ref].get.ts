/**
 * BFF-Proxy für Rezeptbilder.
 *
 * Ein `<img src>` im Browser kann weder die HMAC-Header noch das Session-JWT
 * mitschicken — also holt dieser Endpunkt das Bild signiert von der API und
 * reicht die Bytes durch. Er ist bewusst eng: exakt eine Upstream-Route
 * (GET /sync/images/download), exakt ein Ref-Format. Ob die Referenz dem
 * angemeldeten Konto gehört, prüft die API selbst und antwortet sonst 403.
 */
import { apiFetchRaw } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

/** Ein UUID-Segment, wie die API es vergibt: kleingeschriebenes Hex. */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/**
 * Exakt das Ref-Format der API: `{userUuid}/{recipeId}/{hash12}.webp`.
 *
 * Geprüft wird der rohe, nicht dekodierte Routen-Parameter — prozentkodierte
 * Tricks wie `%2e%2e` fallen damit durch, bevor irgendetwas signiert wird.
 */
const IMAGE_REF = new RegExp(`^${UUID}/${UUID}/[0-9a-f]{12}\\.webp$`)

export default defineEventHandler(async (event): Promise<Uint8Array> => {
  const ref = getRouterParam(event, 'ref') ?? ''
  if (!IMAGE_REF.test(ref)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Ungültige Bildreferenz.' })
  }

  // Ohne Session gar nicht erst signieren — wie beim Sync-Proxy: ein
  // Unangemeldeter soll diesen Server nicht als Signaturquelle benutzen können.
  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  // Der ref darf wörtlich in den Query-String: Das Muster oben lässt nur Hex,
  // Bindestriche, Schrägstriche und `.webp` zu — nichts davon braucht eine
  // Kodierung. Fehler der API (403/404) wirft `apiFetchRaw` als gleichlautenden
  // Statuscode weiter; eine Fehlerseite wird also nie mit Bild-Headern beantwortet.
  const bytes = await apiFetchRaw(`/sync/images/download?ref=${ref}`, {
    sessionToken,
    // Besucher-IP für faire Rate-Limits — gerade hier wichtig: Ein Nutzer,
    // der eine bilderreiche Übersicht erstmals lädt, darf nicht alle anderen
    // Web-Nutzer in ein 429 schieben.
    clientIp: resolveVisitorIp(event),
  })

  // Identisch zur API: Der Dateiname trägt einen Inhalts-Hash, ein geändertes
  // Bild bekommt eine neue Adresse — deshalb darf diese Antwort unbegrenzt
  // gecacht werden. Gesetzt wird erst nach erfolgreichem Abruf, Fehler oben
  // verlassen den Handler ohne diese Header.
  setResponseHeaders(event, {
    'content-type': 'image/webp',
    'cache-control': 'public, max-age=31536000, immutable',
  })

  return bytes
})
