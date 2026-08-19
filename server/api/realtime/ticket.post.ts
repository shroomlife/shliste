/**
 * Kurzlebiges Ticket für den Echtzeit-Stream.
 *
 * Der Browser verbindet sich mit `EventSource` direkt zum Stream der API, weil
 * EventSource keine Header setzen kann — weder Authorization noch die
 * HMAC-Header. Statt dessen trägt die Stream-URL ein Einmal-Ticket, das
 * ausschliesslich die vollauthentifizierte Route POST /sync/realtime/ticket
 * ausgibt. Genau die wird hier signiert aufgerufen.
 *
 * Das Ticket ist kurzlebig und einmal einlösbar; es in einer URL zu führen ist
 * deshalb vertretbar, das Session-JWT wäre es nicht.
 */
import { apiFetch } from '../../utils/apiFetch'
import { isRecord } from '../../utils/guards'
import { readSessionToken } from '../../utils/session'

interface RealtimeTicket {
  ticket: string
  expiresIn: number
}

export default defineEventHandler(async (event): Promise<RealtimeTicket> => {
  const sessionToken = readSessionToken(event)
  if (sessionToken === undefined) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Nicht angemeldet.' })
  }

  // Ohne Body: die API erwartet keinen. Der Body-Hash ist damit der des leeren
  // Strings — genau das, was die Gegenseite für einen Request ohne Body rechnet.
  const payload = await apiFetch('/sync/realtime/ticket', { method: 'POST', sessionToken })

  if (!isRecord(payload) || typeof payload.ticket !== 'string' || typeof payload.expiresIn !== 'number') {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Unerwartete Antwort von api.shliste.app beim Ticket.',
    })
  }

  return { ticket: payload.ticket, expiresIn: payload.expiresIn }
})
