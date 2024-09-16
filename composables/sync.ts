export const useSync = () => {
  const listsFromLocalStorage = localStorage.getItem('shliste/lists')
  const productsFromLocalStorage = localStorage.getItem('shliste/products')
  const marketsFromLocalStorage = localStorage.getItem('shliste/markets')
  return {
    lists: listsFromLocalStorage,
    products: productsFromLocalStorage,
    markets: marketsFromLocalStorage,
  } as unknown as GoogleDriveSyncRequest
}
