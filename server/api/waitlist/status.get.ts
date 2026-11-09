import { apiFetch } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  const sessionToken = await getFreshSessionToken(event)
  if (!sessionToken) return { enabled: false, state: 'guest' }
  return apiFetch('/waitlist/status', { sessionToken, clientIp: resolveVisitorIp(event) })
})
