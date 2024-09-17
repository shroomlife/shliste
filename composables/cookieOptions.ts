import type { CookieSerializeOptions } from 'cookie-es'
import moment from 'moment'

export const cookieOptions: CookieSerializeOptions = {
  maxAge: 60 * 60 * 24 * 365,
  expires: moment().add(1, 'year').toDate(),
  sameSite: 'strict',
  secure: true,
}
