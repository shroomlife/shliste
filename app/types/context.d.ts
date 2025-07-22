import type { OAuth2Client } from 'google-auth-library'

declare module 'h3' {
  interface H3EventContext {
    oauth2Client: OAuth2Client
  }

  interface H3Event {
    req: IncomingMessage
    res: ServerResponse
    context: H3EventContext
  }
}
