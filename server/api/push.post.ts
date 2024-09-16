import { google } from 'googleapis'
import type { H3Event, EventHandlerRequest, H3Error } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<SyncPushResponse | undefined> => {
  try {
    const cookies = parseCookies(event)
    const body = await readBody(event) as GoogleDriveSyncRequest

    const googleToken = cookies['shliste/googleToken']

    if (!googleToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No Google Token',
      })
    }

    const parsedGoogleToken = JSON.parse(googleToken) as GoogleToken
    const oauth2Client = event.context.oauth2Client
    oauth2Client.setCredentials(parsedGoogleToken)

    const currentTimestamp = new Date().getTime()

    if (!parsedGoogleToken.expiry_date || currentTimestamp >= parsedGoogleToken.expiry_date) {
      const newToken = await oauth2Client.refreshAccessToken()
      parsedGoogleToken.access_token = newToken.credentials.access_token as string
      parsedGoogleToken.expiry_date = newToken.credentials.expiry_date as number
      parsedGoogleToken.refresh_token = newToken.credentials.refresh_token as string
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    try {
      if (typeof parsedGoogleToken.fileId !== 'undefined') {
        const saveResponse = await drive.files.update({
          requestBody: {
            name: 'shliste.app.json',
            mimeType: 'application/json',
          },
          media: {
            body: JSON.stringify(body),
            mimeType: 'application/json',
          },
          fileId: parsedGoogleToken.fileId,
        })
        return {
          fileId: saveResponse.data.id,
          expiry_date: parsedGoogleToken.expiry_date,
          access_token: parsedGoogleToken.access_token,
          refresh_token: parsedGoogleToken.refresh_token,
        } as SyncPushResponse
      }
    }
    catch (error) {
      console.error('Error at Update', error)
    }

    const saveResponse = await drive.files.create({
      requestBody: {
        name: 'shliste.app.json',
        mimeType: 'application/json',
        parents: ['root'],
      },
      media: {
        body: JSON.stringify(body),
        mimeType: 'application/json',
      },
    })

    return {
      fileId: saveResponse.data.id,
      expiry_date: parsedGoogleToken.expiry_date,
      access_token: parsedGoogleToken.access_token,
      refresh_token: parsedGoogleToken.refresh_token,
    } as SyncPushResponse
  }
  catch (error: unknown) {
    console.error('Error at Sync', error)
    sendError(event, error as H3Error)
  }
})
