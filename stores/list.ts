import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

const localStorageKey = 'shliste/lists'

export const useListStore = defineStore('listStore', {
  state: (): ListStore => {
    const savedLists = localStorage.getItem(localStorageKey)
    return {
      lists: savedLists ? JSON.parse(savedLists) : [],
      listEdit: null as List | null,
    }
  },
  getters: {
    getLists: state => state.lists,
    getListEdit: (state): List | null => state.listEdit,
    getArchivedLists: state => state.lists.filter(list => list.archivedAt),
    getActiveLists: state => state.lists
      .filter(list => !list.archivedAt)
      .sort((a: List, b: List) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
      .reverse(),
    getListByUuid: state => (uuid: string): List | undefined => state.lists.find(list => list.uuid === uuid),
  },
  actions: {
    setListEdit(list: List | null) {
      this.listEdit = list
    },
    addNewList() {
      this.listEdit = {
        products: [] as Product[],
      } as List
    },
    addList(list: List) {
      this.lists.push(list)
      this.saveLists()
    },
    archiveList(uuid: string) {
      const list = this.lists.find(list => list.uuid === uuid)
      if (list) {
        list.archivedAt = new Date()
      }
      this.saveLists()
    },
    unarchiveList(uuid: string) {
      const list = this.lists.find(list => list.uuid === uuid)
      if (list) {
        list.archivedAt = null
      }
      this.saveLists()
    },
    removeList(uuid: string) {
      this.lists = this.lists.filter(list => list.uuid !== uuid)
      this.saveLists()
    },
    saveLists() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.lists))
    },
    updateList(uuid: string, updatedList: List) {
      const list = this.lists.find(list => list.uuid === uuid)
      if (list) {
        list.name = updatedList.name
        list.updatedAt = new Date()
      }
      this.saveLists()
    },
    addItem(list: List, name: string): boolean {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      console.log('foundList', foundList)
      if (foundList) {
        const newProduct: Product = {
          uuid: uuidv4(),
          name: name,
          description: '',
          checked: false,
          deleted: false,
        }
        foundList.products.push(newProduct)
        this.saveLists()
        return true
      }
      return false
    },
    checkProduct(list: List, product: Product) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        const foundProduct = foundList.products.find(loopedProduct => loopedProduct.uuid === product.uuid)
        if (foundProduct) {
          foundProduct.checked = !foundProduct.checked
        }
      }
      this.saveLists()
    },
    removeProduct(list: List, product: Product) {
      const foundList = this.lists.find(loopedList => loopedList.uuid === list.uuid)
      if (foundList) {
        foundList.products = foundList.products.filter(loopedProduct => loopedProduct.uuid !== product.uuid)
      }
      this.saveLists()
    },
  },
})
