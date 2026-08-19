/**
 * Definition der lokalen IndexedDB.
 *
 * IndexedDB ist die Quelle der Wahrheit dieser App — auch ohne Konto. Ein
 * Konto ist optional und nur für Abgleich und Teilen nötig. Alles, was hier
 * liegt, existiert unabhängig davon, ob der Server je erreichbar war.
 *
 * Der Aufbau folgt dem Contract von api.shliste.app: eine Tabelle je
 * Entität, Kinder liegen nicht eingebettet in ihrem Elternteil. Grund ist
 * der Push: er überträgt Zeilen, nicht Dokumente, und ein eingebettetes Item
 * hätte keinen eigenen Zeitstempel für das Last-Write-Wins.
 */
import type { DBSchema, IDBPDatabase } from 'idb'
import type {
  Badge,
  IsoUtc,
  List,
  ListItem,
  ListMember,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
} from '../../shared/types/domain'

export const DB_NAME = 'shliste'
export const DB_VERSION = 1

/**
 * 1 = diese Zeile wurde lokal geändert und muss gepusht werden.
 *
 * Bewusst eine Zahl und kein boolean: IndexedDB kann boolean nicht
 * indizieren (es ist kein gültiger Schlüsseltyp). Ohne Index müsste die
 * Sync-Engine für jeden Push jede Tabelle vollständig lesen.
 */
export type DirtyFlag = 0 | 1

/** Muss gepusht werden. */
export const DIRTY: DirtyFlag = 1
/** Deckungsgleich mit dem Server. */
export const CLEAN: DirtyFlag = 0

/** Domänenzeile plus das lokale Push-Flag. */
export type Dirty<T> = T & { dirty: DirtyFlag }

export type ListRow = Dirty<List>
export type ListItemRow = Dirty<ListItem>
export type RecipeRow = Dirty<Recipe>
export type RecipeIngredientRow = Dirty<RecipeIngredient>
export type RecipeStepRow = Dirty<RecipeStep>
export type RecipeChatMessageRow = Dirty<RecipeChatMessage>
export type BadgeRow = Dirty<Badge>

/**
 * Mitgliedschaften trägt bewusst kein `dirty`: der Client ändert sie nie
 * direkt, sondern nur über die Einladungs-Endpunkte der API. Lokal sind sie
 * eine reine Projektion des Serverzustands, und was man nicht pusht, muss
 * man auch nicht als schmutzig markieren.
 */
export type ListMemberRow = ListMember

/**
 * Die Schlüssel des Key-Value-Stores mit ihren Werttypen.
 *
 * - `hasMigrated`: wurden die lokalen Daten einmalig auf den Server geladen?
 * - `legacyImported`: wurden die localStorage-Dokumente der alten Fassung
 *   in diese Datenbank übernommen?
 * - `lastSyncedAt`: Ende des letzten erfolgreichen Abgleichs
 * - `lastSignedInUserId`: wer war zuletzt angemeldet? Weicht die ID beim
 *   nächsten Anmelden ab, gehören die lokalen Daten einem anderen Konto.
 * - `lastEventId`: Cursor des Event-Streams, damit nach einem Verbindungs-
 *   abbruch nicht von vorn gelesen werden muss.
 */
export interface SyncMetaMap {
  hasMigrated: boolean
  /**
   * Wurden die Dokumente aus `localStorage` der alten Fassung übernommen?
   *
   * Getrennt von `hasMigrated`, weil es eine andere Frage beantwortet: Dieses
   * Flag betrifft den Weg von localStorage in die lokale Datenbank und läuft
   * ohne Konto, `hasMigrated` den Weg von hier auf den Server.
   */
  legacyImported: boolean
  lastSyncedAt: IsoUtc
  lastSignedInUserId: string
  lastEventId: string
}

export type SyncMetaKey = keyof SyncMetaMap
export type SyncMetaValue = SyncMetaMap[SyncMetaKey]

/**
 * Typisierung für `idb`: bindet Schlüssel-, Wert- und Indextypen je Store,
 * sodass ein Tippfehler im Storenamen oder ein falscher Indexschlüssel schon
 * beim Typecheck auffällt statt zur Laufzeit im Browser.
 */
export interface ShlisteDb extends DBSchema {
  lists: {
    key: string
    value: ListRow
    indexes: { 'by-dirty': DirtyFlag }
  }
  list_items: {
    key: string
    value: ListItemRow
    indexes: { 'by-listId': string, 'by-dirty': DirtyFlag }
  }
  recipes: {
    key: string
    value: RecipeRow
    indexes: { 'by-dirty': DirtyFlag }
  }
  recipe_ingredients: {
    key: string
    value: RecipeIngredientRow
    indexes: { 'by-recipeId': string, 'by-dirty': DirtyFlag }
  }
  recipe_steps: {
    key: string
    value: RecipeStepRow
    indexes: { 'by-recipeId': string, 'by-dirty': DirtyFlag }
  }
  recipe_chat_messages: {
    key: string
    value: RecipeChatMessageRow
    indexes: { 'by-recipeId': string, 'by-dirty': DirtyFlag }
  }
  badges: {
    key: string
    value: BadgeRow
    indexes: { 'by-recipeId': string, 'by-dirty': DirtyFlag }
  }
  /**
   * Zusammengesetzter Schlüssel: eine Mitgliedschaft ist genau ein Paar aus
   * Liste und Nutzer. Ein eigenes ID-Feld gäbe es dafür weder im Contract
   * noch bräuchte man es.
   */
  list_members: {
    key: [string, string]
    value: ListMemberRow
    indexes: { 'by-listId': string }
  }
  /** Reiner Key-Value-Store, deshalb ohne keyPath und ohne Index. */
  sync_meta: {
    key: SyncMetaKey
    value: SyncMetaValue
  }
}

/**
 * Legt Stores und Indizes an. Läuft ausschliesslich in der
 * `upgradeneeded`-Transaktion von `openDB`.
 *
 * Version 1 hat noch keine Migrationen: Es gibt keine ältere IndexedDB im
 * Feld. Die Übernahme der alten localStorage-Daten ist kein Schema-Upgrade,
 * sondern ein einmaliger Datenimport (siehe `hasMigrated` in `sync_meta`).
 */
export function createSchema(db: IDBPDatabase<ShlisteDb>): void {
  const lists = db.createObjectStore('lists', { keyPath: 'id' })
  lists.createIndex('by-dirty', 'dirty')

  const listItems = db.createObjectStore('list_items', { keyPath: 'id' })
  listItems.createIndex('by-listId', 'listId')
  listItems.createIndex('by-dirty', 'dirty')

  const recipes = db.createObjectStore('recipes', { keyPath: 'id' })
  recipes.createIndex('by-dirty', 'dirty')

  const ingredients = db.createObjectStore('recipe_ingredients', { keyPath: 'id' })
  ingredients.createIndex('by-recipeId', 'recipeId')
  ingredients.createIndex('by-dirty', 'dirty')

  const steps = db.createObjectStore('recipe_steps', { keyPath: 'id' })
  steps.createIndex('by-recipeId', 'recipeId')
  steps.createIndex('by-dirty', 'dirty')

  const chatMessages = db.createObjectStore('recipe_chat_messages', { keyPath: 'id' })
  chatMessages.createIndex('by-recipeId', 'recipeId')
  chatMessages.createIndex('by-dirty', 'dirty')

  const badges = db.createObjectStore('badges', { keyPath: 'id' })
  badges.createIndex('by-recipeId', 'recipeId')
  badges.createIndex('by-dirty', 'dirty')

  const members = db.createObjectStore('list_members', { keyPath: ['listId', 'userId'] })
  members.createIndex('by-listId', 'listId')

  db.createObjectStore('sync_meta')
}
