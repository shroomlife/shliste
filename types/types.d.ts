interface ListStore {
  lists: List[]
  listEdit: List | null
}

interface List {
  uuid: string
  name: string
  createdAt: Date | null
  updatedAt: Date | null
  archivedAt: Date | null
}
