/**
 * Die Anbindung der Ports an die lokale Datenbank.
 *
 * OFFENE SCHULD, BEWUSST AN EINER STELLE GEBÜNDELT: Die Lese- und
 * Schreibpaare unten greifen über `getDb()` direkt auf die Stores zu, statt
 * `app/db/repositories.ts` zu benutzen. Das ist kein Versehen, sondern eine
 * Lücke im Bestand: Die Repository-Funktionen sind für LOKALE Bearbeitungen
 * gebaut. Jedes `upsert*` dort setzt `dirty = 1` und stempelt `updatedAt` auf
 * jetzt — genau falsch für eine Zeile, die gerade vom Server kommt und ihre
 * Server-Zeitstempel behalten muss. Zum Lesen fehlt ausserdem der Zugriff auf
 * gelöschte Zeilen: `getItemsForList` und Geschwister filtern Tombstones
 * heraus, das Merge braucht sie aber.
 *
 * Diese sieben Paare gehören deshalb nach `app/db/repositories.ts` (etwa als
 * `putPulledRow` je Entität). Bis dahin stehen sie hier — an genau einer
 * Stelle, damit der Umzug ein einziger Handgriff bleibt.
 *
 * Alles, wofür es bereits eine Repository-Funktion gibt, benutzt sie:
 * insbesondere `clearDirtyFlags` mit seiner Snapshot-Prüfung, die nirgends
 * ein zweites Mal stehen darf.
 */
import type { IsoUtc, ListMember } from '../../../shared/types/domain'
import { getDb } from '../../db/client'
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
  clearDirtyFlags,
  replaceListMembers,
  setHasMigrated,
  setLastSyncedAt,
  type DirtyStoreName,
} from '../../db/repositories'
import type { DirtyRows, EntityStore, LocalDataCounts, RowStores, SyncStore } from './ports'

const lists: EntityStore<ListRow> = {
  read: async id => (await getDb()).get('lists', id),
  write: async (row) => {
    await (await getDb()).put('lists', row)
  },
}

const items: EntityStore<ListItemRow> = {
  read: async id => (await getDb()).get('list_items', id),
  write: async (row) => {
    await (await getDb()).put('list_items', row)
  },
}

const recipes: EntityStore<RecipeRow> = {
  read: async id => (await getDb()).get('recipes', id),
  write: async (row) => {
    await (await getDb()).put('recipes', row)
  },
}

const ingredients: EntityStore<RecipeIngredientRow> = {
  read: async id => (await getDb()).get('recipe_ingredients', id),
  write: async (row) => {
    await (await getDb()).put('recipe_ingredients', row)
  },
}

const steps: EntityStore<RecipeStepRow> = {
  read: async id => (await getDb()).get('recipe_steps', id),
  write: async (row) => {
    await (await getDb()).put('recipe_steps', row)
  },
}

const badges: EntityStore<BadgeRow> = {
  read: async id => (await getDb()).get('badges', id),
  write: async (row) => {
    await (await getDb()).put('badges', row)
  },
}

const chatMessages: EntityStore<RecipeChatMessageRow> = {
  read: async id => (await getDb()).get('recipe_chat_messages', id),
  write: async (row) => {
    await (await getDb()).put('recipe_chat_messages', row)
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
 * Der Standard-Port: die echte IndexedDB dieses Browsers.
 *
 * Als Objekt und nicht als Klasse — es gibt nichts zu vererben und keinen
 * Zustand zu halten. Die Verbindung selbst verwaltet `app/db/client.ts`.
 */
export const localStore: SyncStore = {
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
}
