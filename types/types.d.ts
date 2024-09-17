interface SyncPullResponse {
  data?: GoogleDriveSyncRequest
  fileId?: string
  expiry_date: number
  access_token: string
  refresh_token: string
}

interface SyncPushResponse {
  fileId: string
  expiry_date: number
  access_token: string
  refresh_token: string
}
