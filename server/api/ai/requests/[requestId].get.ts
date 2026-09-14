import { apiFetch } from '../../../utils/apiFetch'
import { getFreshSessionToken } from '../../../utils/sessionRefresh'

/** Nur Status lesen; die API bindet die ID zusätzlich an die Konto-UUID. */
export default defineEventHandler(async (event): Promise<unknown> => {
  const requestId = getRouterParam(event, 'requestId') ?? ''
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const sessionToken = await getFreshSessionToken(event)
  if (sessionToken === null) throw createError({ statusCode: 401, message: 'Nicht angemeldet.' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return apiFetch(`/ai/requests/${requestId}`, { sessionToken, clientIp: resolveVisitorIp(event), timeoutMs: 8_000 })
})
