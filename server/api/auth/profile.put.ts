/**
 * Den eigenen Namen ändern, den andere an Einträgen in geteilten Listen sehen.
 *
 * Eigene Route statt eines Eintrags in der Allowlist des Sync-Proxys: Nach der
 * Antwort muss auch das Profil-Cookie den neuen Namen tragen, sonst zeigte
 * `/api/auth/me` nach dem nächsten Neuladen wieder den alten. Das Cookie ist
 * httpOnly und lässt sich nur hier schreiben.
 *
 * Ein leerer Name oder `null` heißt: wieder den Namen aus dem Google-Konto
 * zeigen. Kürzen und Kappen auf 40 Zeichen macht die API.
 */
import type { ProfileNames } from '#shared/types/domain'
import { apiFetch } from '../../utils/apiFetch'
import { parseDisplayNameInput, parseProfileNames } from '../../utils/profile'
import { persistProfile, readProfile } from '../../utils/session'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

export default defineEventHandler(async (event): Promise<ProfileNames> => {
  const displayName = parseDisplayNameInput(await readBody(event))
  if (displayName === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Es wurde kein Name übermittelt.' })
  }

  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  const payload = await apiFetch('/sync/profile', {
    method: 'PUT',
    rawBody: JSON.stringify({ displayName }),
    sessionToken,
    clientIp: resolveVisitorIp(event),
  })

  const names = parseProfileNames(payload)
  if (names === null) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Unerwartete Antwort von api.shliste.app beim Namen.',
    })
  }

  // Ohne lesbares Profil-Cookie gibt es nichts fortzuschreiben; das ist ein
  // Anzeigeproblem und kein Grund, die gespeicherte Änderung zu verschweigen.
  const profile = readProfile(event)
  if (profile !== null) persistProfile(event, { ...profile, displayName: names.displayName })

  return names
})
