import { google } from 'googleapis'
import type { H3Event, EventHandlerRequest, H3Error } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
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
          id: saveResponse.data.id,
        }
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
      id: saveResponse.data.id,
    }
  }
  catch (error: unknown) {
    console.error('Error at Sync', error)
    sendError(event, error as H3Error)
  }
})
