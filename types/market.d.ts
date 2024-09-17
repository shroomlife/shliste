interface Market {
  uuid: string
  name: string
  address: string
  createdAt: Date | null
  updatedAt: Date | null
}

interface MarketStore {
  markets: Market[]
  marketEdit: Market | null
}
