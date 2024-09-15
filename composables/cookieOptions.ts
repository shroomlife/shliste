import type { CookieSerializeOptions } from 'cookie-es'
import moment from 'moment'

export const cookieOptions: CookieSerializeOptions = {
  maxAge: 60 * 60 * 24 * 30,
  expires: moment().add(1, 'month').toDate(),
  sameSite: 'lax',
  secure: true,
  priority: 'high',
}
