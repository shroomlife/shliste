interface GoogleDriveSyncRequest {
  lists: List[]
  products: ListedProduct[]
  markets: Market[]
  recipes: Recipe[]
  fileId?: string
}

interface GoogleDriveSyncRequestRaw {
  lists: string
  products: string
  markets: string
  recipes: string
  fileId?: string
}

interface GoogleToken {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  expiry_date: number
  id_token: string
  fileId?: string
}

interface GoogleUser {
  iss: string
  azp: string
  aud: string
  sub: string
  email: string
  email_verified: boolean
  at_hash: string
  iat: number
  exp: number
}
