import { defineStore } from 'pinia'

export const useAppStore = defineStore('appStore', {
  state: () => {
    return {
      sidebar: {
        isOpen: false,
      },
    }
  },
  getters: {
    getSidebarIsOpen: state => state.sidebar.isOpen,
  },
  actions: {
    openSidebar() {
      this.setSidebarIsOpen(true)
    },
    closeSidebar() {
      this.setSidebarIsOpen(false)
    },
    setSidebarIsOpen(value: boolean) {
      this.sidebar.isOpen = value
    },
  },
})
