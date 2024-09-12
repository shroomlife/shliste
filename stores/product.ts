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
      console.log(foundProduct)
      if (foundProduct) {
        this.productEdit = foundProduct
      }
    },
    deleteProduct(uuid: string) {
      this.products = this.products.filter((product: ListedProduct) => product.uuid !== uuid)
      this.saveProducts()
    },
    updateProduct(uuid: string, product: ListedProduct) {
      const foundProduct = this.products.find((product: ListedProduct) => product.uuid === uuid)
      if (foundProduct) {
        foundProduct.name = product.name
        foundProduct.description = product.description
        foundProduct.brand = product.brand
        foundProduct.updatedAt = new Date()
      }
      this.saveProducts()
    },
    saveProducts() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.products))
    },
  },
  getters: {
    getProducts: state => state.products,
    getProductEdit: state => state.productEdit,
    getProductsCount: state => state.products.length,
  },
})
