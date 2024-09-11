interface ListStore {
  lists: List[]
  listEdit: List | null
}

interface Product {
  uuid: string
  name: string
  description?: string
  checked: boolean
  deleted: boolean
}

interface List {
  uuid: string
  name: string
  products: Product[]
  createdAt: Date | null
  updatedAt: Date | null
  archivedAt: Date | null
}
