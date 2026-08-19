/**
 * Abmelden: beide Session-Cookies löschen.
 *
 * Die API kennt keinen Widerruf — das JWT bleibt bis zu seinem Ablauf gültig.
 * Abmelden heisst hier deshalb: der Browser gibt das Token her und kann es
 * nicht zurückholen, weil er es wegen httpOnly nie zu Gesicht bekommen hat.
 *
 * POST und nicht GET, damit kein Prefetch und kein <img>-Aufruf eine Sitzung
 * beenden kann.
 */
import { clearSessionCookies } from '../../utils/session'

export default defineEventHandler((event) => {
  clearSessionCookies(event)
  return { ok: true }
})
