/**
 * Was die Engine von der lokalen Datenbank braucht — als Schnittstelle, nicht
 * als Import.
 *
 * WARUM: Die Engine soll ohne IndexedDB testbar sein. Über diese Ports läuft
 * jeder Zugriff, und ein Test setzt an ihre Stelle eine Map. Zugleich hängt
 * die Engine damit an einer Abstraktion statt an der konkreten Datenbank
 * (Dependency Inversion) — die Reihenfolge der Aufrufe ist Sache der Engine,
 * das Speichern Sache von `store.ts`.
 *
 * Der Schnitt folgt dem, was die einzelnen Schritte tatsächlich brauchen:
 * `push.ts` bekommt nur den Push-Port, `pull.ts` nur den Pull-Port. Wer
 * weniger sehen darf, kann weniger kaputt machen.
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
import type { DirtyStoreName } from '../../db/repositories'

/**
 * Lesen und Schreiben einer einzelnen Zeile.
 *
 * Bewusst je Entität ein eigenes Paar statt einer generischen Funktion mit
 * Storenamen: `idb` bindet Storenamen und Wertetyp aneinander, ein
 * generischer Helfer müsste diese Bindung mit einem Cast aufbrechen. Dieselbe
 * Begründung wie bei den Upserts in `app/db/repositories.ts`.
 */
export interface EntityStore<TRow> {
  read: (id: string) => Promise<TRow | undefined>
  write: (row: TRow) => Promise<void>
}

/** Die sieben Tabellen, die am Abgleich teilnehmen. */
export interface RowStores {
  lists: EntityStore<ListRow>
  items: EntityStore<ListItemRow>
  recipes: EntityStore<RecipeRow>
  ingredients: EntityStore<RecipeIngredientRow>
  steps: EntityStore<RecipeStepRow>
  badges: EntityStore<BadgeRow>
  chatMessages: EntityStore<RecipeChatMessageRow>
}

/** Alles, was noch nicht gepusht wurde. */
export interface DirtyRows {
  lists: ListRow[]
  items: ListItemRow[]
  recipes: RecipeRow[]
  ingredients: RecipeIngredientRow[]
  steps: RecipeStepRow[]
  chatMessages: RecipeChatMessageRow[]
  badges: BadgeRow[]
}

export interface PushStore {
  rows: RowStores
  readDirty: () => Promise<DirtyRows>
  /**
   * Nimmt das Push-Flag von den genannten Zeilen — aber nur, wenn sie seit
   * `snapshot` unverändert sind. Die Prüfung liegt in der Datenbankschicht,
   * weil nur sie den aktuellen Stand der Zeile kennt.
   */
  clearDirty: (store: DirtyStoreName, ids: readonly string[], snapshot: IsoUtc) => Promise<void>
}

export interface PullStore {
  rows: RowStores
  /** Ersetzt die Mitglieder einer Liste durch den Stand des Servers. */
  replaceMembers: (listId: string, members: readonly ListMember[]) => Promise<void>
  /** Das Wasserzeichen des letzten vollständigen Pulls. */
  readCursor: () => Promise<IsoUtc | null>
  writeCursor: (value: IsoUtc) => Promise<void>
}

/**
 * Was die Echtzeit-Auswertung zusätzlich zum Pull braucht.
 *
 * Die beiden Dirty-Abfragen entscheiden, ob ein Ereignis mit einem Delta
 * beantwortet werden darf: Liegt lokal eine ungesendete Änderung an derselben
 * Zeile, wäre ein Delta die halbe Wahrheit — es würde den Serverstand
 * hereinholen, ohne den eigenen hinauszugeben. In dem Fall gehört ein
 * vollständiger Lauf her, der erst pusht und dann zieht.
 */
export interface RealtimeStore extends PullStore {
  /** Ist die Liste selbst oder eine ihrer Positionen ungesendet? */
  isListDirty: (listId: string) => Promise<boolean>
  /** Ist das Rezept oder eines seiner Kinder ungesendet? */
  isRecipeDirty: (recipeId: string) => Promise<boolean>
  /**
   * Entfernt eine Liste samt Kindern ENDGÜLTIG und ohne Grabstein.
   *
   * Ein lokales `deletedAt` wäre hier falsch: Es ginge beim nächsten Push als
   * Löschabsicht zurück und würde die Liste für alle übrigen Mitglieder
   * zerstören, obwohl dieses Konto sie nur nicht mehr sieht.
   */
  removeList: (listId: string) => Promise<void>
}

export interface LocalDataCounts {
  lists: number
  recipes: number
}

export interface SessionStore {
  readHasMigrated: () => Promise<boolean>
  writeHasMigrated: (value: boolean) => Promise<void>
  /**
   * Wer war zuletzt angemeldet? Meldet sich derselbe Nutzer erneut an, sind
   * die lokalen Daten seine eigenen und dürfen ohne Rückfrage zusammengeführt
   * werden.
   */
  readLastSignedInUserId: () => Promise<string | null>
  /** Zähler für den Vergleich mit `GET /sync/status`. */
  countLocalData: () => Promise<LocalDataCounts>
  /** Anzahl der Zeilen, die noch auf ihren Push warten. */
  countPending: () => Promise<number>
}

/** Der vollständige Port, wie `sync.ts` ihn braucht. */
export interface SyncStore extends PushStore, PullStore, SessionStore {}
