import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler((event: H3Event<EventHandlerRequest>) => {
  const oauth2Client = event.context.oauth2Client

  const scopes: string[] = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ]

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    response_type: 'code',
    prompt: 'consent',
  })

  return {
    url,
  }
})
