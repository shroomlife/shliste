import { defineStore } from 'pinia'

const localStorageKey = 'shliste/products'

export const useProductStore = defineStore('productStore', {
  state: () => {
    const savedProducts = localStorage.getItem(localStorageKey)
    return {
      productEdit: null as ListedProduct | null,
      products: savedProducts ? JSON.parse(savedProducts) as ListedProduct[] : [],
    }
  },
  actions: {
    addNewProduct() {
      this.productEdit = {} as ListedProduct
    },
    setProductEdit(product: ListedProduct | null) {
      this.productEdit = product
    },
    addProduct(product: ListedProduct) {
      this.products.push(product)
      this.saveProducts()
    },
    editProduct(uuid: string) {
      const foundProduct = this.products.find((product: ListedProduct) => product.uuid === uuid)
      if (foundProduct) {
        this.productEdit = foundProduct
      }
    },
    deleteProduct(uuid: string) {
      this.products = this.products.filter((product: ListedProduct) => product.uuid !== uuid)
      this.saveProducts()
    },
    setProducts(products: ListedProduct[] | null) {
      this.products = products ?? [] as ListedProduct[]
      this.saveProductsLocal()
    },
    updateProduct(uuid: string, product: ListedProduct) {
      const foundProduct = this.products.find((product: ListedProduct) => product.uuid === uuid)
      if (foundProduct) {
        foundProduct.name = product.name
        foundProduct.description = product.description
        foundProduct.brand = product.brand
        foundProduct.marketIds = product.marketIds
        foundProduct.updatedAt = new Date()
      }
      this.saveProducts()
    },
    saveProductsLocal() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.products))
    },
    async saveProducts() {
      this.saveProductsLocal()
      const googleStore = useGoogleStore()
      await googleStore.triggerPush()
    },
  },
  getters: {
    getProducts: state => state.products,
    getProductEdit: state => state.productEdit,
    getProductsCount: state => state.products.length,
  },
})
