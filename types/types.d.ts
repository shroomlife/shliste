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
  supermarkets: Supermarket[]
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

interface Supermarket {
  id: string
  name: string
}

interface GoogleDriveSyncRequest {
  lists: List[]
  products: Product[]
  fileId?: string
}

interface GoogleDriveSyncRequestRaw {
  lists: string
  products: string
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
