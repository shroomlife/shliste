export const useSync = () => {
  const listsFromLocalStorage = localStorage.getItem('shliste/lists')
  const parsedListsFromLocalStorage = JSON.parse(listsFromLocalStorage ?? '[]')
  const productsFromLocalStorage = localStorage.getItem('shliste/products')
  const parsedProductsFromLocalStorage = JSON.parse(productsFromLocalStorage ?? '[]')
  const marketsFromLocalStorage = localStorage.getItem('shliste/markets')
  const parsedMarketsFromLocalStorage = JSON.parse(marketsFromLocalStorage ?? '[]')
  return {
    lists: parsedListsFromLocalStorage ?? [],
    products: parsedProductsFromLocalStorage ?? [],
    markets: parsedMarketsFromLocalStorage ?? [],
  } as unknown as GoogleDriveSyncRequest
}
