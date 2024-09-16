interface ListStore {
  lists: List[]
  listEdit: List | null
  productEdit: Product | null
}

interface Product {
  uuid: string
  name: string
  brand?: string
  description?: string
  checked: boolean
  deleted: boolean
}

interface ListedProduct extends Product {
  createdAt: Date | null
  updatedAt: Date | null
  archivedAt: Date | null
  marketIds: string[]
}

interface Market {
  uuid: string
  name: string
  address: string
  createdAt: Date | null
  updatedAt: Date | null
}

interface List {
  uuid: string
  name: string
  color: string
  products: Product[]
  createdAt: Date | null
  updatedAt: Date | null
  archivedAt: Date | null
}

interface GoogleDriveSyncRequest {
  lists: List[]
  products: Product[]
  markets: Market[]
  fileId?: string
}

interface GoogleDriveSyncRequestRaw {
  lists: string
  products: string
  markets: string
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

interface SyncPullResponse {
  data: GoogleDriveSyncRequestRaw
  fileId: string
  expiry_date?: number
  access_token?: string
  refresh_token?: string
}

interface SyncPushResponse {
  id: string
  expiry_date?: number
  access_token?: string
  refresh_token?: string
}
