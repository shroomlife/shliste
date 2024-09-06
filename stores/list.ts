import { defineStore } from 'pinia'

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
    getListByUuid: state => (uuid: string) => state.lists.find(list => list.uuid === uuid),
  },
  actions: {
    setListEdit(list: List | null) {
      this.listEdit = list
    },
    addNewList() {
      this.listEdit = {} as List
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
  },
})
