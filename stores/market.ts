import { defineStore } from 'pinia'

const localStorageKey = 'shliste/markets'

export const useMarketStore = defineStore('marketStore', {
  state: () => {
    const savedMarkets = localStorage.getItem(localStorageKey)
    return {
      marketEdit: null as Market | null,
      markets: savedMarkets ? JSON.parse(savedMarkets) as Market[] : [],
    }
  },
  actions: {
    addNewMarket() {
      this.marketEdit = {} as Market
    },
    setMarketEdit(market: Market | null) {
      this.marketEdit = market
    },
    addMarket(market: Market) {
      this.markets.push(market)
      this.saveMarkets()
    },
    editMarket(uuid: string) {
      const foundMarket = this.markets.find((market: Market) => market.uuid === uuid)
      if (foundMarket) {
        this.marketEdit = foundMarket
      }
    },
    deleteMarket(uuid: string) {
      this.markets = this.markets.filter((market: Market) => market.uuid !== uuid)
      this.saveMarkets()
    },
    setMarkets(markets: Market[] | null) {
      this.markets = markets ?? [] as Market[]
    },
    updateMarket(uuid: string, market: Market) {
      const foundProduct = this.markets.find((market: Market) => market.uuid === uuid)
      if (foundProduct) {
        foundProduct.name = market.name
        foundProduct.address = market.address
        foundProduct.updatedAt = new Date()
      }
      this.saveMarkets()
    },
    saveMarketsLocal() {
      localStorage.setItem(localStorageKey, JSON.stringify(this.markets))
    },
    async saveMarkets() {
      this.saveMarketsLocal()
      const googleStore = useGoogleStore()
      await googleStore.triggerPush()
    },
  },
  getters: {
    getMarkets: state => state.markets,
    getMarketEdit: state => state.marketEdit,
    getMarketsCount: state => state.markets.length,
  },
})
