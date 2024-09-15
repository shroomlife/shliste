import { google } from 'googleapis'

export default defineNitroPlugin((nitroApp) => {
  const runtimeConfig = useRuntimeConfig()

  const oauth2Client = new google.auth.OAuth2(
    runtimeConfig.google.client.id,
    runtimeConfig.google.client.secret,
    runtimeConfig.google.client.redirectUri,
  )

  nitroApp.hooks.addHooks({
    request: (event) => {
      event.context.oauth2Client = oauth2Client
    },
  })
})
