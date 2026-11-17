/**
 * BFF-Proxy für die KI-Bilder hinter Listeneinträgen (SHL-1).
 *
 * Gebaut wie `server/api/link-previews/[hash].get.ts`, aus demselben Grund:
 * Ein `<img src>` kann weder HMAC-Header noch Session-JWT mitschicken. Auch
 * hier keine Eigentümerprüfung: Der Dateiname ist die Prüfsumme eines
 * gemalten Bildes einer Gattung ("Gurke"), das nichts über ein Konto verrät.
 * Die API verlangt trotzdem eine gültige Anmeldung.
 */
import { apiFetchRaw } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

/** Die Prüfsumme des Bildes: 32 kleingeschriebene Hex-Zeichen, sonst nichts. */
const HASH = /^[0-9a-f]{32}$/

export default defineEventHandler(async (event): Promise<Uint8Array> => {
  const hash = getRouterParam(event, 'hash') ?? ''
  if (!HASH.test(hash)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Ungültige Bildreferenz.' })
  }

  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  const bytes = await apiFetchRaw(`/sync/item-images/${hash}`, {
    sessionToken,
    clientIp: resolveVisitorIp(event),
  })

  // Name = Prüfsumme der Bytes, also unbegrenzt cachebar. Erst nach Erfolg gesetzt.
  setResponseHeaders(event, {
    'content-type': 'image/webp',
    'cache-control': 'public, max-age=31536000, immutable',
  })

  return bytes
})
