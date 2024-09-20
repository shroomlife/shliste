export const mergeData = (
  oldData: GoogleDriveSyncRequestRaw,
  newData: GoogleDriveSyncRequest,
): GoogleDriveSyncRequest => {
  // Parse die JSON-Strings in den Schlüsseln 'lists' und 'products' und speichere sie in neuen Variablen
  const oldLists: List[] = JSON.parse(oldData.lists || '[]')
  const oldProducts: ListedProduct[] = JSON.parse(oldData.products || '[]')
  const oldMarkets: Market[] = JSON.parse(oldData.markets || '[]')
  const oldRecipes: Recipe[] = JSON.parse(oldData.recipes || '[]')

  const newLists: List[] = newData.lists
  const newProducts: ListedProduct[] = newData.products
  const newMarkets: Market[] = newData.markets
  const newRecipes: Recipe[] = newData.recipes

  // Filter the old data to keep only items that exist in the new data
  const filteredOldLists = oldLists.filter(oldList => newLists.some(newList => newList.uuid === oldList.uuid))
  const filteredOldProducts = oldProducts.filter(oldProduct => newProducts.some(newProduct => newProduct.uuid === oldProduct.uuid))
  const filteredOldMarkets = oldMarkets.filter(oldMarket => newMarkets.some(newMarket => newMarket.uuid === oldMarket.uuid))
  const filteredOldRecipes = oldRecipes.filter(oldRecipe => newRecipes.some(newRecipe => newRecipe.uuid === oldRecipe.uuid))

  // Merge the 'products' arrays
  const mergedProducts = mergeArraysByUuid<ListedProduct>(filteredOldProducts, newProducts)

  // Merge the 'lists' arrays
  const mergedLists = mergeArraysByUuid<List>(filteredOldLists, newLists)

  // Merge the 'markets' arrays
  const mergedMarkets = mergeArraysByUuid<Market>(filteredOldMarkets, newMarkets)

  // Merge the 'recipes' arrays
  const mergedRecipes = mergeArraysByUuid<Recipe>(filteredOldRecipes, newRecipes)

  // Zusammenführen der 'products' innerhalb jeder Liste
  for (const list of mergedLists) {
    const oldList = oldLists.find(l => l.uuid === list.uuid)
    const newList = newLists.find(l => l.uuid === list.uuid)

    const oldListProducts = oldList ? oldList.products || [] : []
    const newListProducts = newList ? newList.products || [] : []

    list.products = mergeArraysByUuid<Product>(oldListProducts, newListProducts)
  }

  const result: GoogleDriveSyncRequest = {
    fileId: newData.fileId,
    lists: mergedLists,
    products: mergedProducts,
    markets: mergedMarkets,
    recipes: mergedRecipes,
  }

  return result
}

function mergeArraysByUuid<T extends { uuid: string }>(oldArray: T[], newArray: T[]): T[] {
  const itemMap = new Map<string, T>()

  // Füge die alten Elemente zur Map hinzu
  for (const item of oldArray) {
    itemMap.set(item.uuid, item)
  }

  // Aktualisiere vorhandene Elemente oder füge neue hinzu
  for (const item of newArray) {
    if (itemMap.has(item.uuid)) {
      const existingItem = itemMap.get(item.uuid)!
      itemMap.set(item.uuid, { ...existingItem, ...item })
    }
    else {
      itemMap.set(item.uuid, item)
    }
  }

  return Array.from(itemMap.values())
}
