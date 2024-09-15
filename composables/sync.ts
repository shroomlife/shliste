export const useSync = () => {
  const listsFromLocalStorage = localStorage.getItem('shliste/lists')
  const productsFromLocalStorage = localStorage.getItem('shliste/products')
  return {
    lists: listsFromLocalStorage,
    products: productsFromLocalStorage,
  } as unknown as GoogleDriveSyncRequest
}
