import { google } from 'googleapis'
import type { H3Event, EventHandlerRequest, H3Error } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
  try {
    const cookies = parseCookies(event)
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

    let fileId = parsedGoogleToken.fileId

    if (!fileId) {
      // Search for the file if fileId is not available
      const searchResponse = await drive.files.list({
        q: 'name=\'shliste.app.json\' and trashed=false',
        fields: 'files(id, name)',
        spaces: 'drive',
      })

      const files = searchResponse.data.files
      if (files && files.length > 0) {
        fileId = files[0].id as string
      }
      else {
        throw createError({
          statusCode: 404,
          statusMessage: 'File not found',
        })
      }
    }

    try {
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media',
        fields: 'id,trashed',
      })

      if (response.data.trashed) {
        throw createError({
          statusCode: 404,
          statusMessage: 'File is deleted',
        })
      }

      // Return the file content
      return {
        data: response.data,
        fileId,
      }
    }
    catch (error) {
      console.error('Error retrieving file:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error retrieving file from Google Drive',
      })
    }
  }
  catch (error: unknown) {
    console.error('Error at Pull', error)
    sendError(event, error as H3Error)
  }
})
