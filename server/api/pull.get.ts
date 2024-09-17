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

    console.log('refresh_token2', parsedGoogleToken.refresh_token, new Date())

    const oauth2Client = event.context.oauth2Client
    oauth2Client.setCredentials(parsedGoogleToken)

    const currentTimestamp = new Date().getTime()

    if (!parsedGoogleToken.expiry_date || currentTimestamp >= parsedGoogleToken.expiry_date) {
      const newToken = await oauth2Client.refreshAccessToken()
      parsedGoogleToken.access_token = newToken.credentials.access_token as string
      parsedGoogleToken.expiry_date = newToken.credentials.expiry_date as number
      parsedGoogleToken.refresh_token = newToken.credentials.refresh_token as string
    }

    const updatedTokenData = {
      expiry_date: parsedGoogleToken.expiry_date,
      access_token: parsedGoogleToken.access_token,
      refresh_token: parsedGoogleToken.refresh_token,
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    let fileId = parsedGoogleToken.fileId

    if (!fileId) {
      // Search for the file if fileId is not available
      const searchResponse = await drive.files.list({
        q: 'name=\'shliste.app.json\' and trashed=false',
        fields: 'files(id)',
        spaces: 'drive',
      })

      const files = searchResponse.data.files
      if (files && files.length > 0) {
        fileId = files[0].id as string
      }
      else {
        return updatedTokenData as SyncPullResponse
      }
    }

    try {
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media',
        fields: 'id,trashed',
      })

      if (response.data.trashed) {
        return updatedTokenData as SyncPullResponse
      }

      return {
        data: response.data,
        fileId,
        ...updatedTokenData,
      } as SyncPullResponse
    }
    catch (error: unknown) {
      console.error('Error at Pull', error)
      return updatedTokenData as SyncPullResponse
    }
  }
  catch (error: unknown) {
    console.error('Error at Pull', error)
    sendError(event, error as H3Error)
  }
})
