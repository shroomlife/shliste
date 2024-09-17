import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

const localStorageKey = 'shliste/lists'

export const useListStore = defineStore('listStore', {
  state: (): ListStore => {
    const savedLists = localStorage.getItem(localStorageKey)
    const parsedSavedLists = savedLists ? JSON.parse(savedLists) : []
    parsedSavedLists.forEach((list: List) => {
      if (typeof list.color === 'undefined') {
        list.color = useRandomColorRGBA(0.2)
        localStorage.setItem(localStorageKey, JSON.stringify(parsedSavedLists))
      }
    })
    return {
      lists: parsedSavedLists as List[] ?? [],
      listEdit: null as List | null,
      productEdit: null as Product | null,
    }
  },
  getters: {
    getLists: (state): List[] => state.lists,
    getListEdit: (state): List | null => state.listEdit,
    getProductEdit: (state): Product | null => state.productEdit,
    getArchivedLists: (state): List[] => state.lists.filter(list => list.archivedAt),
    getActiveLists: state => state.lists
      .filter(list => !list.archivedAt)
      .sort((a: List, b: List) => new Date(a.updatedAt!).getTime() - new Date(b.updatedAt!).getTime())
      .reverse(),
    getListByUuid: state => (uuid: string): List | undefined => state.lists.find(list => list.uuid === uuid),
    getActiveListsCount: state => state.lists.filter(list => !list.archivedAt).length,
    getArchivedListsCount: state => state.lists.filter(list => list.archivedAt).length,
  },
  actions: {
    setListEdit(list: List | null) {
      this.listEdit = list
    },
    setProductEdit(product: Product | null) {
      this.productEdit = product
    },
    addNewList() {
      this.listEdit = {
        uuid: '',
        name: '',
        description: '',
        color: '',
        products: [],
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as List
    },
    addList(list: List) {
      const listToAdd = Object.assign({}, list)
      this.lists.push(listToAdd)
      this.saveLists()
    },
    archiveList(list: List) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        foundList.archivedAt = new Date()
        foundList.updatedAt = new Date()
        this.saveLists()
      }
    },
    unarchiveList(list: List) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        list.archivedAt = null
        list.updatedAt = new Date()
        this.saveLists()
      }
    },
    removeList(uuid: string) {
      this.lists = this.lists.filter(list => list.uuid !== uuid)
      this.saveLists()
    },
    updateList(uuid: string, updatedList: List) {
      const foundList = this.lists.find(list => list.uuid === uuid)
      if (foundList) {
        foundList.name = updatedList.name
        foundList.updatedAt = new Date()
        this.saveLists()
      }
    },
    changeColor(uuid: string, color: string) {
      const foundList = this.lists.find(list => list.uuid === uuid)
      if (foundList) {
        foundList.color = color
        foundList.updatedAt = new Date()
        this.saveLists()
      }
    },
    setLists(lists: List[] | null) {
      this.lists = lists ?? [] as List[]
      this.saveListsLocal()
    },
    addItem(list: List, name: string): boolean {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        const newProduct: Product = {
          uuid: uuidv4(),
          name: name,
          description: '',
          checked: false,
        }
        foundList.products.push(newProduct)
        foundList.updatedAt = new Date()
        this.saveLists()
        return true
      }
      return false
    },
    updateProduct(product: Product) {
      const foundList = this.lists.find((list: List) => {
        return list.products.some(p => p.uuid === product.uuid)
      })
      if (foundList) {
        const foundProduct = foundList.products.find(loopedProduct => loopedProduct.uuid === product.uuid)
        if (foundProduct) {
          foundProduct.name = product.name
          foundProduct.description = product.description
          foundProduct.brand = product.brand
          foundList.updatedAt = new Date()
          this.saveLists()
        }
      }
    },
    checkProduct(list: List, product: Product) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        const foundProduct = foundList.products.find(loopedProduct => loopedProduct.uuid === product.uuid)
        if (foundProduct) {
          foundProduct.checked = true
          foundList.updatedAt = new Date()
          this.saveLists()
        }
      }
    },
    uncheckProduct(list: List, product: Product) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        const foundProduct = foundList.products.find(loopedProduct => loopedProduct.uuid === product.uuid)
        if (foundProduct) {
          foundProduct.checked = false
          foundList.updatedAt = new Date()
          this.saveLists()
        }
      }
    },
    uncheckAllProducts(list: List) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        foundList.products.forEach((product) => {
          product.checked = false
        })
        foundList.updatedAt = new Date()
        this.saveLists()
      }
    },
    removeProduct(list: List, product: Product) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        foundList.products = foundList.products.filter(loopedProduct => loopedProduct.uuid !== product.uuid)
        foundList.updatedAt = new Date()
        this.saveLists()
      }
    },
    addListedProduct(list: List, uuid: string) {
      const productStore = useProductStore()
      const foundProduct = productStore.getProducts.find(product => product.uuid === uuid) as ListedProduct
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid) as List
      if (foundList && foundProduct) {
        const newProduct: Product = {
          uuid: uuidv4(),
          name: foundProduct.name,
          description: foundProduct.description || '',
          brand: foundProduct.brand || '',
          checked: false,
          parentId: foundProduct.uuid,
        }
        foundList.products.push(newProduct)
        foundList.updatedAt = new Date()
        this.saveLists()
        return true
      }
      return false
    },
    saveListsLocal() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.lists))
    },
    async saveLists() {
      this.saveListsLocal()
      const googleStore = useGoogleStore()
      await googleStore.triggerPush()
    },
  },
})
