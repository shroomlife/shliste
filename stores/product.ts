import { defineStore } from 'pinia'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    products: [
      {
        uuid: '1',
        name: 'Gurke',
      },
    ] as Product[],
  }),
  actions: {
  },
  getters: {
    getProducts: state => state.products,
  },
})
