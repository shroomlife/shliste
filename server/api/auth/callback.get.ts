import type { H3Event, EventHandlerRequest } from 'h3'
import type { OAuth2Client } from 'google-auth-library'
import { cookieOptions } from '~/composables/cookieOptions'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
  try {
    const query = getQuery(event) as { code: string, scope: string }

    if (typeof query.code === 'undefined' || typeof query.scope === 'undefined') {
      throw new Error('Bad Request')
    }

    const oauth2Client: OAuth2Client = event.context.oauth2Client
    const { tokens } = await oauth2Client.getToken(query.code)
    oauth2Client.setCredentials(tokens)

    // Decode the JWT from tokens.id_token
    const jwtParts = tokens.id_token?.split('.') as string[]
    const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString())

    // Extract relevant user information
    const googleUser: GoogleUser = {
      ...payload,
    }

    setCookie(event, 'shliste/googleUser', JSON.stringify(googleUser), cookieOptions)
    setCookie(event, 'shliste/googleToken', JSON.stringify(tokens), cookieOptions)
  }
  catch (error) {
    console.error('Fehler bei der Authentifizierung:', error)
  }
  await sendRedirect(event, '/')
})
