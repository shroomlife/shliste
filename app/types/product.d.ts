interface Product {
  uuid: string
  name: string
  brand?: string
  description?: string
  checked: boolean
  parentId?: string
}

interface ListedProduct extends Product {
  createdAt: Date | null
  updatedAt: Date | null
  marketIds: string[]
}

interface ListedProductStore {
  products: ListedProduct[]
  productEdit: ListedProduct | null
}
