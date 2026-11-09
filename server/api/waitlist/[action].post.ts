import { apiFetch } from '../../utils/apiFetch'
import { getFreshSessionToken } from '../../utils/sessionRefresh'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  const action = getRouterParam(event, 'action')
  if (!['join', 'confirm', 'withdraw', 'subscribe', 'unsubscribe'].includes(action ?? '')) throw createError({ statusCode: 404 })
  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) throw createError({ statusCode: 403 })
  const declaredLength = Number(getHeader(event, 'content-length'))
  if (!Number.isFinite(declaredLength) || declaredLength < 2 || declaredLength > 1024) throw createError({ statusCode: 413 })
  const body: unknown = await readBody(event)
  const valid = ((value: unknown) => {
    if (!value || typeof value !== 'object') return false
    const data = value as Record<string, unknown>
    return ['confirm', 'unsubscribe'].includes(action ?? '') ? typeof data.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(data.token) : action === 'withdraw' || (data.consent === true && data.consentVersion === '2026-11-06' && (action !== 'subscribe' || (typeof data.email === 'string' && data.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))))
  })(body)
  if (!valid) throw createError({ statusCode: 400 })
  const sessionToken = ['confirm', 'subscribe', 'unsubscribe'].includes(action ?? '') ? undefined : await getFreshSessionToken(event)
  if (sessionToken === null) throw createError({ statusCode: 401 })
  const rawBody = JSON.stringify(['confirm', 'unsubscribe'].includes(action ?? '') ? { token: (body as Record<string, unknown>).token } : action === 'subscribe' ? { email: String((body as Record<string, unknown>).email).trim().toLowerCase(), consent: true, consentVersion: '2026-11-06' } : action === 'join' ? { consent: true, consentVersion: '2026-11-06' } : {})
  return apiFetch(`/waitlist/${action}`, { method: 'POST', rawBody, ...(sessionToken ? { sessionToken } : {}), clientIp: resolveVisitorIp(event) })
})
