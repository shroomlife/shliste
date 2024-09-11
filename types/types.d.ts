interface ListStore {
  lists: List[]
  listEdit: List | null
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
