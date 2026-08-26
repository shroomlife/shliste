/**
 * BFF-Proxy für die Vorschaubilder von Link-Einträgen.
 *
 * Wortgleich gebaut wie `server/api/images/[...ref].get.ts` und aus demselben
 * Grund: Ein `<img src>` im Browser kann weder die HMAC-Header noch das
 * Session-JWT mitschicken, also holt dieser Endpunkt die Bytes signiert von
 * der API und reicht sie durch. Er ist bewusst eng: exakt eine
 * Upstream-Route, exakt ein Parameterformat.
 *
 * Anders als bei den Rezeptbildern gibt es hier keine Eigentümerprüfung, und
 * das ist Absicht: Der Dateiname ist die Prüfsumme des Bildes einer
 * ÖFFENTLICHEN Webseite. Wer den Hash kennt, kennt das Bild bereits. Die API
 * verlangt trotzdem eine gültige Anmeldung, damit der Speicher nicht zum
 * offenen Bilderdienst wird.
 */
import { apiFetchRaw } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

/** Die Prüfsumme des Bildes: 32 kleingeschriebene Hex-Zeichen, sonst nichts. */
const HASH = /^[0-9a-f]{32}$/

export default defineEventHandler(async (event): Promise<Uint8Array> => {
  // Der rohe, nicht dekodierte Parameter wird geprüft — prozentkodierte
  // Tricks wie `%2e%2e` fallen damit durch, bevor irgendetwas signiert wird.
  const hash = getRouterParam(event, 'hash') ?? ''
  if (!HASH.test(hash)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Ungültige Bildreferenz.' })
  }

  // Ohne Session gar nicht erst signieren — wie beim Sync-Proxy: ein
  // Unangemeldeter soll diesen Server nicht als Signaturquelle benutzen können.
  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  // Der Hash darf wörtlich in den Pfad: Das Muster oben lässt nur Hex zu.
  // Fehler der API (404) wirft `apiFetchRaw` als gleichlautenden Statuscode
  // weiter; eine Fehlerseite wird also nie mit Bild-Headern beantwortet.
  const bytes = await apiFetchRaw(`/sync/link-previews/${hash}`, {
    sessionToken,
    // Besucher-IP für faire Rate-Limits: Eine Liste voller Links lädt beim
    // ersten Öffnen viele Bilder auf einmal, und das darf nicht alle anderen
    // Web-Nutzer in ein 429 schieben.
    clientIp: resolveVisitorIp(event),
  })

  // Der Dateiname trägt die Prüfsumme der Bytes, ein geändertes Bild bekommt
  // also eine neue Adresse — deshalb darf diese Antwort unbegrenzt gecacht
  // werden. Gesetzt wird erst nach erfolgreichem Abruf; die Fehlerpfade oben
  // verlassen den Handler ohne diese Header.
  setResponseHeaders(event, {
    'content-type': 'image/webp',
    'cache-control': 'public, max-age=31536000, immutable',
  })

  return bytes
})
