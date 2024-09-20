export const useSync = () => {
  const listsFromLocalStorage = localStorage.getItem('shliste/lists')
  const parsedListsFromLocalStorage = JSON.parse(listsFromLocalStorage ?? '[]')

  const productsFromLocalStorage = localStorage.getItem('shliste/products')
  const parsedProductsFromLocalStorage = JSON.parse(productsFromLocalStorage ?? '[]')

  const marketsFromLocalStorage = localStorage.getItem('shliste/markets')
  const parsedMarketsFromLocalStorage = JSON.parse(marketsFromLocalStorage ?? '[]')

  const recipesFromLocalStorage = localStorage.getItem('shliste/recipes')
  const parsedRecipesFromLocalStorage = JSON.parse(recipesFromLocalStorage ?? '[]')

  return {
    lists: parsedListsFromLocalStorage ?? [],
    products: parsedProductsFromLocalStorage ?? [],
    markets: parsedMarketsFromLocalStorage ?? [],
    recipes: parsedRecipesFromLocalStorage ?? [],
  } as unknown as GoogleDriveSyncRequest
}
