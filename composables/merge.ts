export const mergeData = (
  oldData: GoogleDriveSyncRequestRaw,
  newData: GoogleDriveSyncRequestRaw,
): GoogleDriveSyncRequestRaw => {
  // Parse die JSON-Strings in den Schlüsseln 'lists' und 'products' und speichere sie in neuen Variablen
  const oldLists: List[] = JSON.parse(oldData.lists || '[]')
  const oldProducts: Product[] = JSON.parse(oldData.products || '[]')
  const newLists: List[] = JSON.parse(newData.lists || '[]')
  const newProducts: Product[] = JSON.parse(newData.products || '[]')

  // Zusammenführen der 'products' Arrays
  const mergedProducts = mergeArraysByUuid<Product>(oldProducts, newProducts)

  // Zusammenführen der 'lists' Arrays
  const mergedLists = mergeArraysByUuid<List>(oldLists, newLists)

  // Zusammenführen der 'products' innerhalb jeder Liste
  for (const list of mergedLists) {
    const oldList = oldLists.find(l => l.uuid === list.uuid)
    const newList = newLists.find(l => l.uuid === list.uuid)

    const oldListProducts = oldList ? oldList.products || [] : []
    const newListProducts = newList ? newList.products || [] : []

    list.products = mergeArraysByUuid<Product>(oldListProducts, newListProducts)
  }

  // Konvertiere die Arrays zurück in JSON-Strings
  const result: GoogleDriveSyncRequestRaw = {
    lists: JSON.stringify(mergedLists),
    products: JSON.stringify(mergedProducts),
  }

  console.log('Merged Data', result)

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
