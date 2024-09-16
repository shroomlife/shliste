export const mergeData = (
  oldData: GoogleDriveSyncRequestRaw,
  newData: GoogleDriveSyncRequest,
): GoogleDriveSyncRequest => {
  // Parse die JSON-Strings in den Schlüsseln 'lists' und 'products' und speichere sie in neuen Variablen
  const oldLists: List[] = JSON.parse(oldData.lists || '[]')
  const oldProducts: ListedProduct[] = JSON.parse(oldData.products || '[]')
  const oldMarkets: Market[] = JSON.parse(oldData.markets || '[]')

  const newLists: List[] = newData.lists
  const newProducts: ListedProduct[] = newData.products
  const newMarkets: Market[] = newData.markets

  // Zusammenführen der 'products' Arrays
  const mergedProducts = mergeArraysByUuid<ListedProduct>(oldProducts, newProducts)

  // Zusammenführen der 'lists' Arrays
  const mergedLists = mergeArraysByUuid<List>(oldLists, newLists)

  const mergedMarkets = mergeArraysByUuid<Market>(oldMarkets, newMarkets)

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
