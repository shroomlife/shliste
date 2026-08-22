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
import type { HistoryEntry, IsoUtc, ListMember } from '../../../shared/types/domain'
import type {
  BadgeRow,
  HistoryEntryRow,
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
  historyEntries: HistoryEntryRow[]
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
  /**
   * Übernimmt einen gepullten Historien-Eintrag — nur, wenn seine Id lokal
   * unbekannt ist. Einträge sind append-only: Ein vorhandener (auch ein noch
   * ungepushter eigener) bleibt unangetastet, ein Merge findet nicht statt.
   */
  putPulledHistoryEntry: (entry: HistoryEntry) => Promise<void>
  /**
   * Behält je Parent die 50 neuesten Historien-Einträge — der Spiegel des
   * Server-Trims, damit beide Seiten dieselbe Menge halten.
   */
  trimHistoryForParent: (parentId: string) => Promise<void>
  /** Das Wasserzeichen des letzten vollständigen Pulls. */
  readCursor: () => Promise<IsoUtc | null>
  writeCursor: (value: IsoUtc) => Promise<void>
}

/**
 * Der harte Löschpfad für Listen, die dieses Konto nicht mehr sieht.
 *
 * Eigene Schnittstelle, weil ihn zwei voneinander unabhängige Wege brauchen:
 * das Ereignis `list_removed` und das Feld `revokedListIds` der Pull-Antwort.
 * Der Delta-Abruf braucht ihn nicht und bekommt ihn deshalb auch nicht — wer
 * weniger sehen darf, kann weniger kaputt machen.
 */
export interface ListRemovalStore {
  /**
   * Entfernt eine Liste samt Kindern ENDGÜLTIG und ohne Grabstein.
   *
   * Ein lokales `deletedAt` wäre hier falsch: Es ginge beim nächsten Push als
   * Löschabsicht zurück und würde die Liste für alle übrigen Mitglieder
   * zerstören, obwohl dieses Konto sie nur nicht mehr sieht.
   */
  removeList: (listId: string) => Promise<void>
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
export interface RealtimeStore extends PullStore, ListRemovalStore {
  /** Ist die Liste selbst oder eine ihrer Positionen ungesendet? */
  isListDirty: (listId: string) => Promise<boolean>
  /** Ist das Rezept oder eines seiner Kinder ungesendet? */
  isRecipeDirty: (recipeId: string) => Promise<boolean>
}

export interface LocalDataCounts {
  lists: number
  recipes: number
}

/**
 * Was die Konfliktauflösung zusätzlich braucht.
 *
 * Beide Eingriffe sind gross und selten, deshalb stehen sie hier und nicht im
 * gewöhnlichen Ablauf: Sie laufen ausschliesslich auf eine ausdrückliche
 * Entscheidung des Nutzers hin.
 */
export interface ConflictStore {
  /**
   * Nimmt das Push-Flag von allen lokal gelöschten Zeilen und meldet, wie
   * viele es waren. Für "zusammenführen": Eine offline getroffene Löschung
   * darf den Serverbestand nicht mitreissen.
   */
  clearDirtyOnDeleted: () => Promise<number>
  /**
   * Löscht alle abgeglichenen Nutzdaten dieses Geräts, ohne Grabsteine, und
   * setzt das Wasserzeichen zurück. Für "Server übernehmen".
   */
  wipeLocalData: () => Promise<void>
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

/**
 * Der vollständige Port, wie `sync.ts` ihn braucht.
 *
 * `ListRemovalStore` ist dabei: Die Pull-Antwort nennt entzogene Listen, und
 * `runPull` muss sie hart entfernen können (siehe `pull.ts`).
 */
export interface SyncStore extends PushStore, PullStore, SessionStore, ListRemovalStore {}
