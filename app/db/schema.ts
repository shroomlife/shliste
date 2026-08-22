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
  HistoryEntry,
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

/**
 * Version 2: neuer Store `history_entries` (synchronisierte Lösch-Historie,
 * Gegenstück zu Androids `history_entries`-Tabelle). Version 1 war der
 * Erststand mit den acht Stores plus `sync_meta`.
 */
export const DB_VERSION = 2

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

/**
 * Rein lokale Felder der Listenzeile — sie verlassen dieses Gerät nie.
 *
 * `seenAt` ist das Gesehen-Wasserzeichen: wann diese Liste zuletzt geöffnet
 * war. Daraus zählt die Übersicht die ungesehenen Fremdänderungen — dasselbe
 * Muster wie `lastSeenAt` in der Android-App (ShlisteDao.getUnseenForeignChanges).
 *
 * NIE im Push: Die Nutzlast zählt ihre Felder explizit auf (`toPushList` in
 * `app/sync/engine/push.ts`), ein lokales Feld kann also nicht hineinrutschen.
 * NIE vom Pull überschrieben: `putListRow` bewahrt das Wasserzeichen der
 * bestehenden Zeile (Begründung dort).
 *
 * Optional auf Typ-Ebene, denn IndexedDB ist schemalos: Zeilen aus der Zeit
 * vor diesem Feld tragen es nicht, und ein Versions-Bump wäre dafür falsch —
 * es gibt keinen Index und nichts zu migrieren. `undefined` bedeutet dasselbe
 * wie `null`: noch nie gesehen.
 */
export interface ListLocalFields {
  seenAt?: IsoUtc | null
}

export type ListRow = Dirty<List> & ListLocalFields
export type ListItemRow = Dirty<ListItem>
export type RecipeRow = Dirty<Recipe>
export type RecipeIngredientRow = Dirty<RecipeIngredient>
export type RecipeStepRow = Dirty<RecipeStep>
export type RecipeChatMessageRow = Dirty<RecipeChatMessage>
export type BadgeRow = Dirty<Badge>
export type HistoryEntryRow = Dirty<HistoryEntry>

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
   * Die Lösch-Historie. `by-parentId` trägt die Verlaufsansicht und den
   * Trim je Liste bzw. Rezept, `by-dirty` den Push — wie überall sonst.
   */
  history_entries: {
    key: string
    value: HistoryEntryRow
    indexes: { 'by-parentId': string, 'by-dirty': DirtyFlag }
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
 * IDEMPOTENT über `objectStoreNames`: Jeder Store entsteht nur, wenn er
 * fehlt. So trägt dieselbe Funktion die Neuanlage (alte Version 0) und jedes
 * Upgrade (etwa 1 → 2), ohne Bestandsdaten anzufassen — ein vorhandener
 * Store wird nie neu erzeugt und damit nie geleert. Auf einer Version-1-
 * Datenbank legt der Lauf ausschliesslich `history_entries` an.
 *
 * Die Übernahme der alten localStorage-Daten ist kein Schema-Upgrade,
 * sondern ein einmaliger Datenimport (siehe `hasMigrated` in `sync_meta`).
 */
export function createSchema(db: IDBPDatabase<ShlisteDb>): void {
  if (!db.objectStoreNames.contains('lists')) {
    const lists = db.createObjectStore('lists', { keyPath: 'id' })
    lists.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('list_items')) {
    const listItems = db.createObjectStore('list_items', { keyPath: 'id' })
    listItems.createIndex('by-listId', 'listId')
    listItems.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('recipes')) {
    const recipes = db.createObjectStore('recipes', { keyPath: 'id' })
    recipes.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('recipe_ingredients')) {
    const ingredients = db.createObjectStore('recipe_ingredients', { keyPath: 'id' })
    ingredients.createIndex('by-recipeId', 'recipeId')
    ingredients.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('recipe_steps')) {
    const steps = db.createObjectStore('recipe_steps', { keyPath: 'id' })
    steps.createIndex('by-recipeId', 'recipeId')
    steps.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('recipe_chat_messages')) {
    const chatMessages = db.createObjectStore('recipe_chat_messages', { keyPath: 'id' })
    chatMessages.createIndex('by-recipeId', 'recipeId')
    chatMessages.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('badges')) {
    const badges = db.createObjectStore('badges', { keyPath: 'id' })
    badges.createIndex('by-recipeId', 'recipeId')
    badges.createIndex('by-dirty', 'dirty')
  }

  // Version 2: die synchronisierte Lösch-Historie.
  if (!db.objectStoreNames.contains('history_entries')) {
    const history = db.createObjectStore('history_entries', { keyPath: 'id' })
    history.createIndex('by-parentId', 'parentId')
    history.createIndex('by-dirty', 'dirty')
  }

  if (!db.objectStoreNames.contains('list_members')) {
    const members = db.createObjectStore('list_members', { keyPath: ['listId', 'userId'] })
    members.createIndex('by-listId', 'listId')
  }

  if (!db.objectStoreNames.contains('sync_meta')) {
    db.createObjectStore('sync_meta')
  }
}
