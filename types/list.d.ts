interface List {
  uuid: string
  name: string
  description: string
  color: string
  products: Product[]
  createdAt: Date | null
  updatedAt: Date | null
  archivedAt: Date | null
}

interface ListStore {
  lists: List[]
  listEdit: List | null
  productEdit: Product | null
}
