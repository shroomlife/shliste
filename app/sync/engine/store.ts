/**
 * Die Anbindung der Ports an die lokale Datenbank.
 *
 * Alle Datenbankzugriffe laufen über `app/db/repositories.ts`, auch die
 * rohen Lese- und Schreibpaare für den Abgleich. Die brauchen einen eigenen
 * Satz, weil die Funktionen für den normalen Betrieb hier falsch wären:
 * `upsert*` setzt `dirty = 1` und stempelt `updatedAt` auf jetzt — genau
 * verkehrt für eine Zeile, die gerade vom Server kommt und ihre
 * Server-Zeitstempel behalten muss. Und die Lesefunktionen blenden Tombstones
 * aus, die das Zusammenführen braucht, um eine Löschung von "gibt es nicht"
 * zu unterscheiden.
 *
 * Alles, wofür es bereits eine Repository-Funktion gibt, benutzt sie:
 * insbesondere `clearDirtyFlags` mit seiner Snapshot-Prüfung, die nirgends
 * ein zweites Mal stehen darf.
 */
import type { IsoUtc, ListMember } from '../../../shared/types/domain'
import type {
  BadgeRow,
  ListItemRow,
  ListRow,
  RecipeChatMessageRow,
  RecipeIngredientRow,
  RecipeRow,
  RecipeStepRow,
} from '../../db/schema'
import {
  countDirty,
  getDirtyBadges,
  getDirtyChatMessages,
  getDirtyIngredients,
  getDirtyItems,
  getDirtyLists,
  getDirtyRecipes,
  getDirtySteps,
  getHasMigrated,
  getLastSignedInUserId,
  getLastSyncedAt,
  getListsForView,
  getRecipesForView,
  clearDirtyOnDeleted,
  hardDeleteList,
  isDirtyList,
  wipeSyncedData,
  isDirtyRecipeOrChildren,
  countDirtyItemsForList,
  clearDirtyFlags,
  replaceListMembers,
  setHasMigrated,
  setLastSyncedAt,
  type DirtyStoreName,
} from '../../db/repositories'
import type {
  ConflictStore,
  DirtyRows,
  EntityStore,
  LocalDataCounts,
  RealtimeStore,
  RowStores,
  SyncStore,
} from './ports'
import {
  putBadgeRow,
  putChatMessageRow,
  putIngredientRow,
  putItemRow,
  putListRow,
  putRecipeRow,
  putStepRow,
  readBadgeRow,
  readChatMessageRow,
  readIngredientRow,
  readItemRow,
  readListRow,
  readRecipeRow,
  readStepRow,
} from '../../db/repositories'

const lists: EntityStore<ListRow> = {
  read: readListRow,
  write: async (row) => {
    await putListRow(row)
  },
}

const items: EntityStore<ListItemRow> = {
  read: readItemRow,
  write: async (row) => {
    await putItemRow(row)
  },
}

const recipes: EntityStore<RecipeRow> = {
  read: readRecipeRow,
  write: async (row) => {
    await putRecipeRow(row)
  },
}

const ingredients: EntityStore<RecipeIngredientRow> = {
  read: readIngredientRow,
  write: async (row) => {
    await putIngredientRow(row)
  },
}

const steps: EntityStore<RecipeStepRow> = {
  read: readStepRow,
  write: async (row) => {
    await putStepRow(row)
  },
}

const badges: EntityStore<BadgeRow> = {
  read: readBadgeRow,
  write: async (row) => {
    await putBadgeRow(row)
  },
}

const chatMessages: EntityStore<RecipeChatMessageRow> = {
  read: readChatMessageRow,
  write: async (row) => {
    await putChatMessageRow(row)
  },
}

const rows: RowStores = { lists, items, recipes, ingredients, steps, badges, chatMessages }

async function readDirty(): Promise<DirtyRows> {
  // Parallel: Es sind sieben unabhängige Lesevorgänge auf verschiedenen
  // Stores. Ein gemeinsamer Snapshot ist nicht nötig — der Push kappt über
  // `pushSnapshot` ohnehin alles ab, was währenddessen entsteht.
  const [
    dirtyLists,
    dirtyItems,
    dirtyRecipes,
    dirtyIngredients,
    dirtySteps,
    dirtyChatMessages,
    dirtyBadges,
  ] = await Promise.all([
    getDirtyLists(),
    getDirtyItems(),
    getDirtyRecipes(),
    getDirtyIngredients(),
    getDirtySteps(),
    getDirtyChatMessages(),
    getDirtyBadges(),
  ])

  return {
    lists: dirtyLists,
    items: dirtyItems,
    recipes: dirtyRecipes,
    ingredients: dirtyIngredients,
    steps: dirtySteps,
    chatMessages: dirtyChatMessages,
    badges: dirtyBadges,
  }
}

async function countLocalData(): Promise<LocalDataCounts> {
  // Dieselbe Menge, die `GET /sync/status` zählt: nicht gelöschte Listen und
  // Rezepte. Ein anderer Zuschnitt würde den Vergleich "Server leer, lokal
  // nicht" verfälschen.
  const [localLists, localRecipes] = await Promise.all([getListsForView(), getRecipesForView()])
  return { lists: localLists.length, recipes: localRecipes.length }
}

/**
 * Ist an der Liste selbst oder an einer ihrer Positionen etwas ungesendet?
 *
 * Beide Fragen zusammen, weil die Echtzeit-Auswertung nur eine Antwort
 * braucht: Ein Delta ist genau dann sicher, wenn HIER nichts aussteht.
 */
async function isListDirtyWithItems(listId: string): Promise<boolean> {
  if (await isDirtyList(listId)) return true
  return await countDirtyItemsForList(listId) > 0
}

/**
 * Der Standard-Port: die echte IndexedDB dieses Browsers.
 *
 * Als Objekt und nicht als Klasse — es gibt nichts zu vererben und keinen
 * Zustand zu halten. Die Verbindung selbst verwaltet `app/db/client.ts`.
 */
export const localStore: SyncStore & RealtimeStore & ConflictStore = {
  rows,
  readDirty,
  clearDirty: (store: DirtyStoreName, ids: readonly string[], snapshot: IsoUtc) =>
    clearDirtyFlags(store, ids, snapshot),
  replaceMembers: (listId: string, members: readonly ListMember[]) =>
    replaceListMembers(listId, members),
  readCursor: getLastSyncedAt,
  writeCursor: setLastSyncedAt,
  readHasMigrated: getHasMigrated,
  writeHasMigrated: setHasMigrated,
  readLastSignedInUserId: getLastSignedInUserId,
  countLocalData,
  countPending: countDirty,
  isListDirty: isListDirtyWithItems,
  isRecipeDirty: isDirtyRecipeOrChildren,
  removeList: hardDeleteList,
  clearDirtyOnDeleted,
  wipeLocalData: wipeSyncedData,
}
