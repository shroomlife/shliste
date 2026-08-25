/**
 * Der Pull: Serveränderungen herunterladen und zusammenführen.
 *
 * DER CURSOR IST EIN WASSERZEICHEN MIT ÜBERLAPPUNG, KEINE QUITTUNG.
 * `serverTime` aus der Antwort geht beim nächsten Mal als `?since=` zurück.
 * Der Server zieht dabei bewusst Sekunden ab und weicht offenen
 * Schreibtransaktionen aus (`computeCursorTime` in `lib/pull-scope.ts`), sonst
 * fielen Zeilen durchs Raster, die währenddessen geschrieben wurden. Dieselben
 * Zeilen kommen deshalb mehrfach herunter. DAS IST GEWOLLT: Der Merge ist
 * idempotent und darf niemals "schon gesehen, überspringen" annehmen — genau
 * diese Annahme würde die Überlappung wieder zunichte machen.
 *
 * BEI `truncated` RÜCKT DER CURSOR NICHT VOR. Eine gekappte Antwort ist nicht
 * der vollständige Serverstand. Würde das Wasserzeichen trotzdem
 * weiterwandern, fiele alles jenseits der Serverobergrenze dauerhaft aus dem
 * Fenster und fehlte still für immer. Stillstand ist besser als eine
 * unsichtbare Lücke.
 *
 * DAS EINZIGE, WAS EIN PULL LÖSCHT, SIND ENTZOGENE LISTEN (`revokedListIds`).
 * Sonst ergänzt er nur: Eine Zeile, die der Server nicht erwähnt, ist deshalb
 * nicht weg. Ein Entzug ist der Gegenfall — er lässt sich gar nicht anders
 * mitteilen, denn ohne Mitgliedschaft taucht die Liste in keiner Antwort mehr
 * auf.
 */
import type {
  Badge,
  FieldTimestamps,
  HistoryEntry,
  IsoUtc,
  List,
  ListItem,
  ListMember,
  PendingInvite,
  Recipe,
  RecipeChatMessage,
  RecipeIngredient,
  RecipeStep,
} from '../../../shared/types/domain'
import { CLEAN, DIRTY, type DirtyFlag } from '../../db/schema'
import type { LocalRow, PullMergeResult } from '../merge/field-lww'
import { mergePulledEntity } from '../merge/field-lww'
import {
  parseBadge,
  parseChatMessage,
  parseHistoryEntry,
  parseIngredient,
  parseList,
  parseListItem,
  parseMember,
  parsePendingInvite,
  parseRecipe,
  parseStep,
} from './entities'
import { isRecord, parseAll, readArray, readBooleanOr, readIso, readNumber, readNumberOr } from './json'
import type { ListRemovalStore, PullStore, RowStores } from './ports'

/* ------------------------------------------------------------------ *
 * Die Antwort des Servers
 * ------------------------------------------------------------------ */

/** Eine Liste kommt mit ihren Items und ihren Mitgliedern. */
export interface PulledList extends List {
  items: ListItem[]
  members: ListMember[]
}

/** Ein Rezept kommt mit Zutaten, Schritten und Gesprächsverlauf. */
export interface PulledRecipe extends Recipe {
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  chatMessages: RecipeChatMessage[]
}

/** Nur beim inkrementellen Pull vorhanden — beim vollen sind es keine "Änderungen". */
export interface PullChanges {
  lists: number
  recipes: number
  listItems: number
  badges: number
}

export interface PullResponse {
  lists: PulledList[]
  recipes: PulledRecipe[]
  badges: Badge[]
  /**
   * Die Lösch-Historie, flach über alle sichtbaren Listen und eigenen
   * Rezepte — in geteilten Listen auch die Einträge ANDERER Mitglieder.
   * Der Server trimmt auf 50 je Parent.
   */
  historyEntries: HistoryEntry[]
  pendingInvites: PendingInvite[]
  /**
   * Listen, auf die dieses Konto keinen Zugriff mehr hat: entfernt worden,
   * selbst gegangen oder vom Eigentümer gelöscht.
   *
   * Sie stehen in KEINER der anderen Mengen — genau das ist der Punkt: Ohne
   * diese Aufzählung erwähnt eine Pull-Antwort sie schlicht nicht mehr, und
   * sie blieben auf diesem Gerät für immer sichtbar.
   */
  revokedListIds: string[]
  /** `null`, wenn der Server keinen brauchbaren Zeitpunkt geliefert hat. */
  serverTime: IsoUtc | null
  truncated: boolean
  /**
   * Die Änderungsnummer des Kontos, bis zu der diese Antwort reicht.
   *
   * `null`, wenn der Server sie nicht liefert — so verhielt er sich, bevor es
   * das Feld gab. Der Herzschlag vergleicht sie mit dem hier gespeicherten
   * Stand und deckt damit jede Lücke auf, egal woher sie kommt.
   */
  changeSeq: number | null
  /**
   * Es gibt weitere Seiten. Der nächste Abruf schickt diesen Wert zurück.
   *
   * `null` heisst "fertig". Ein Server ohne dieses Feld verhält sich wie
   * bisher: `truncated` allein, und dann bleibt der Cursor stehen.
   */
  nextPageToken: string | null
  changes: PullChanges | null
}

export function parsePullResponse(value: unknown): PullResponse {
  const record = isRecord(value) ? value : {}

  return {
    lists: parseAll(readArray(record, 'lists'), parsePulledList),
    recipes: parseAll(readArray(record, 'recipes'), parsePulledRecipe),
    badges: parseAll(readArray(record, 'badges'), parseBadge),
    // Fehlt das Feld, gibt es keine Historie — so verhielt sich der Server,
    // bevor es sie gab (dieselbe Rollout-Begründung wie bei revokedListIds).
    historyEntries: parseAll(readArray(record, 'historyEntries'), parseHistoryEntry),
    pendingInvites: parseAll(readArray(record, 'pendingInvites'), parsePendingInvite),
    // Fehlt das Feld, ist nichts entzogen worden — so verhielt sich der
    // Server, bevor es das Feld gab. Ein älterer Server darf hier nicht in
    // einen Fehler laufen, sonst hinge der Abgleich an der Reihenfolge des
    // Rollouts.
    revokedListIds: parseAll(readArray(record, 'revokedListIds'), readListId),
    serverTime: readIso(record, 'serverTime'),
    // Fehlt das Feld, gilt die Antwort als vollständig — so verhielt sich der
    // Server, bevor es das Feld gab.
    truncated: readBooleanOr(record, 'truncated', false),
    changeSeq: readNumber(record, 'changeSeq'),
    nextPageToken: readNonEmptyString(record['nextPageToken']),
    changes: parseChanges(record['changes']),
  }
}

/**
 * Engt eine Liste samt ihrer Positionen und Mitglieder ein.
 *
 * Exportiert, weil der Delta-Abruf dieselbe Form bekommt (siehe `delta.ts`).
 * Ein zweiter Parser dort wäre eine zweite Gelegenheit, unterschiedlich streng
 * zu sein.
 */
export function parsePulledList(value: unknown): PulledList | null {
  const list = parseList(value)
  if (list === null || !isRecord(value)) return null

  return {
    ...list,
    items: parseAll(readArray(value, 'items'), parseListItem),
    members: parseAll(readArray(value, 'members'), member => parseMember(member, list.id)),
  }
}

/** Engt ein Rezept samt Zutaten, Schritten und Verlauf ein. Siehe `parsePulledList`. */
export function parsePulledRecipe(value: unknown): PulledRecipe | null {
  const recipe = parseRecipe(value)
  if (recipe === null || !isRecord(value)) return null

  return {
    ...recipe,
    ingredients: parseAll(readArray(value, 'ingredients'), parseIngredient),
    steps: parseAll(readArray(value, 'steps'), parseStep),
    chatMessages: parseAll(readArray(value, 'chatMessages'), parseChatMessage),
  }
}

/**
 * Eine Id aus `revokedListIds`. Alles, was kein nicht-leerer String ist, fällt
 * weg — `parseAll` lässt es dann aus.
 *
 * Ein leerer String träfe keine Zeile und wäre bestenfalls wirkungslos; ein
 * anderer Typ ist ein Vertragsbruch, den eine Löschung nicht ausbaden soll.
 */
/** Ein nicht-leerer String, sonst `null`. */
function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readListId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseChanges(value: unknown): PullChanges | null {
  if (!isRecord(value)) return null

  return {
    lists: readNumberOr(value, 'lists', 0),
    recipes: readNumberOr(value, 'recipes', 0),
    listItems: readNumberOr(value, 'listItems', 0),
    badges: readNumberOr(value, 'badges', 0),
  }
}

/* ------------------------------------------------------------------ *
 * Zusammenführen
 *
 * Je Entität werden nur die Felder aus `MUTABLE_FIELDS` in den Merge gegeben
 * — nur sie nehmen am feldweisen Vergleich teil. Die Ergebniszeile entsteht
 * aus der SERVERZEILE plus diesen Werten, genau wie im Android-Client:
 * `id`, `createdAt` und die Elternreferenz sind unveränderlich und kommen
 * deshalb ungefragt vom Server.
 * ------------------------------------------------------------------ */

function listValues(row: List): Record<string, unknown> {
  return {
    name: row.name,
    color: row.color,
    secret: row.secret,
    lastSuggestedItems: row.lastSuggestedItems,
    sourceUrl: row.sourceUrl,
    deletedAt: row.deletedAt,
  }
}

function itemValues(row: ListItem): Record<string, unknown> {
  return {
    name: row.name,
    quantity: row.quantity,
    checked: row.checked,
    removed: row.removed,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    deletedAt: row.deletedAt,
  }
}

function recipeValues(row: Recipe): Record<string, unknown> {
  return {
    name: row.name,
    color: row.color,
    sourceUrl: row.sourceUrl,
    imagePath: row.imagePath,
    deletedAt: row.deletedAt,
  }
}

function ingredientValues(row: RecipeIngredient): Record<string, unknown> {
  return {
    name: row.name,
    quantity: row.quantity,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    deletedAt: row.deletedAt,
  }
}

function stepValues(row: RecipeStep): Record<string, unknown> {
  return {
    description: row.description,
    orderIndex: row.orderIndex,
    sortKey: row.sortKey,
    isChecked: row.isChecked,
    aiExplanation: row.aiExplanation,
    deletedAt: row.deletedAt,
  }
}

function badgeValues(row: Badge): Record<string, unknown> {
  return {
    recipeName: row.recipeName,
    recipeColor: row.recipeColor,
    recipeImagePath: row.recipeImagePath,
    earnedAt: row.earnedAt,
    deletedAt: row.deletedAt,
  }
}

/**
 * Die lokale Zeile in der Form, die das Merge erwartet.
 *
 * `null` heisst "gibt es lokal nicht" — dann übernimmt `mergePulledEntity` die
 * Serverzeile unverändert. Eine saubere lokale Zeile hat nichts beizutragen
 * und wird dort ebenfalls überschrieben (Begründung steht in `field-lww.ts`).
 */
function toLocalRow<T extends { fieldTimestamps: FieldTimestamps | null }>(
  local: (T & { dirty: DirtyFlag }) | undefined,
  toValues: (row: T) => Record<string, unknown>,
): LocalRow | null {
  if (local === undefined) return null

  return {
    values: toValues(local),
    fieldTimestamps: local.fieldTimestamps,
    dirty: local.dirty === DIRTY,
  }
}

/**
 * GEWINNT LOKAL EIN FELD, BLEIBT DIE ZEILE SCHMUTZIG. Sonst fiele der lokale
 * Gewinner beim nächsten Push aus der Auswahl und wäre verloren, obwohl er den
 * Konflikt gewonnen hat.
 */
function dirtyFlagOf(merged: PullMergeResult): DirtyFlag {
  return merged.dirty ? DIRTY : CLEAN
}

function pickString(values: Record<string, unknown>, key: string, fallback: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : fallback
}

function pickNullableString(values: Record<string, unknown>, key: string, fallback: string | null): string | null {
  const value = values[key]
  if (value === null) return null
  return typeof value === 'string' ? value : fallback
}

function pickBoolean(values: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = values[key]
  return typeof value === 'boolean' ? value : fallback
}

function pickNumber(values: Record<string, unknown>, key: string, fallback: number): number {
  const value = values[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

async function applyList(rows: RowStores, server: PulledList): Promise<void> {
  await rows.lists.mutate(server.id, (local) => {
    const merged = mergePulledEntity('list', toLocalRow(local, listValues), {
      values: listValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      name: pickString(values, 'name', server.name),
      color: pickString(values, 'color', server.color),
      secret: pickBoolean(values, 'secret', server.secret),
      lastSuggestedItems: pickString(values, 'lastSuggestedItems', server.lastSuggestedItems),
      sourceUrl: pickNullableString(values, 'sourceUrl', server.sourceUrl),
      ownerUserId: server.ownerUserId,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
      /*
       * `seenAt` ist rein lokal und darf der Abgleich NIE überschreiben — sonst
       * gälte nach jedem Abgleich jede Liste wieder als "nie gesehen" und die
       * Übersicht flutete mit falschen Hinweisen.
       *
       * Vorher hat `putListRow` das Wasserzeichen bewahrt. Seit hier in EINER
       * Transaktion gelesen und geschrieben wird, gehört es an diese Stelle.
       * Der Compiler hilft dabei nicht: Das Feld ist optional (IndexedDB ist
       * schemalos), ein Weglassen fiele erst im Betrieb auf.
       */
      seenAt: local?.seenAt ?? null,
    }
  })
}

async function applyItem(rows: RowStores, server: ListItem): Promise<void> {
  await rows.items.mutate(server.id, (local) => {
    const merged = mergePulledEntity('listItem', toLocalRow(local, itemValues), {
      values: itemValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      listId: server.listId,
      name: pickString(values, 'name', server.name),
      quantity: pickNumber(values, 'quantity', server.quantity),
      checked: pickBoolean(values, 'checked', server.checked),
      removed: pickBoolean(values, 'removed', server.removed),
      orderIndex: pickNumber(values, 'orderIndex', server.orderIndex),
      sortKey: pickNullableString(values, 'sortKey', server.sortKey),
      createdBy: server.createdBy,
      modifiedBy: server.modifiedBy,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
    }
  })
}

async function applyRecipe(rows: RowStores, server: PulledRecipe): Promise<void> {
  await rows.recipes.mutate(server.id, (local) => {
    const merged = mergePulledEntity('recipe', toLocalRow(local, recipeValues), {
      values: recipeValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      name: pickString(values, 'name', server.name),
      color: pickString(values, 'color', server.color),
      sourceUrl: pickNullableString(values, 'sourceUrl', server.sourceUrl),
      imagePath: pickNullableString(values, 'imagePath', server.imagePath),
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
    }
  })
}

async function applyIngredient(rows: RowStores, server: RecipeIngredient): Promise<void> {
  await rows.ingredients.mutate(server.id, (local) => {
    const merged = mergePulledEntity('recipeIngredient', toLocalRow(local, ingredientValues), {
      values: ingredientValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      recipeId: server.recipeId,
      name: pickString(values, 'name', server.name),
      quantity: pickNumber(values, 'quantity', server.quantity),
      orderIndex: pickNumber(values, 'orderIndex', server.orderIndex),
      sortKey: pickNullableString(values, 'sortKey', server.sortKey),
      createdBy: server.createdBy,
      modifiedBy: server.modifiedBy,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
    }
  })
}

async function applyStep(rows: RowStores, server: RecipeStep): Promise<void> {
  await rows.steps.mutate(server.id, (local) => {
    const merged = mergePulledEntity('recipeStep', toLocalRow(local, stepValues), {
      values: stepValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      recipeId: server.recipeId,
      description: pickString(values, 'description', server.description),
      orderIndex: pickNumber(values, 'orderIndex', server.orderIndex),
      sortKey: pickNullableString(values, 'sortKey', server.sortKey),
      isChecked: pickBoolean(values, 'isChecked', server.isChecked),
      aiExplanation: pickNullableString(values, 'aiExplanation', server.aiExplanation),
      createdBy: server.createdBy,
      modifiedBy: server.modifiedBy,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
    }
  })
}

async function applyBadge(rows: RowStores, server: Badge): Promise<void> {
  await rows.badges.mutate(server.id, (local) => {
    const merged = mergePulledEntity('badge', toLocalRow(local, badgeValues), {
      values: badgeValues(server),
      fieldTimestamps: server.fieldTimestamps,
    })
    const values = merged.values

    return {
      id: server.id,
      recipeId: server.recipeId,
      recipeName: pickString(values, 'recipeName', server.recipeName),
      recipeImagePath: pickNullableString(values, 'recipeImagePath', server.recipeImagePath),
      recipeColor: pickString(values, 'recipeColor', server.recipeColor),
      earnedAt: pickString(values, 'earnedAt', server.earnedAt),
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      deletedAt: pickNullableString(values, 'deletedAt', server.deletedAt),
      fieldTimestamps: merged.fieldTimestamps,
      dirty: dirtyFlagOf(merged),
    }
  })
}

/**
 * Chat-Nachrichten sind append-only und nehmen deshalb nicht am Merge teil.
 *
 * Eine vorhandene Nachricht wird NICHT überschrieben: Sie kann sich nicht
 * geändert haben, und ein Überschreiben würde nur das Dirty-Flag einer noch
 * nicht gepushten Nachricht löschen.
 */
async function applyChatMessage(rows: RowStores, server: RecipeChatMessage): Promise<void> {
  await rows.chatMessages.mutate(server.id, local => (local !== undefined ? null : { ...server, dirty: CLEAN }))
}

/* ------------------------------------------------------------------ *
 * Der Ablauf
 * ------------------------------------------------------------------ */

/**
 * Zeilen, wie der Server sie liefert.
 *
 * Alle Felder sind wahlweise, weil nicht jede Antwort alle Arten enthält: Der
 * volle Pull bringt Listen, Rezepte und Abzeichen, ein Delta je nach Anlass nur
 * eine Liste, einzelne Positionen oder ein Rezept.
 */
export interface PulledRows {
  lists?: readonly PulledList[]
  /** Positionen ohne ihre Liste. Nur der Delta-Abruf liefert sie so. */
  items?: readonly ListItem[]
  recipes?: readonly PulledRecipe[]
  badges?: readonly Badge[]
  /** Die Lösch-Historie. Nur der volle Pull liefert sie, ein Delta nie. */
  historyEntries?: readonly HistoryEntry[]
}

/**
 * Schreibt gezogene Zeilen in die lokale Datenbank.
 *
 * IDEMPOTENT, UND ZWAR ZWINGEND: Dieselben Zeilen kommen wegen der
 * Cursor-Überlappung mehrfach herunter, und ein Delta überschneidet sich
 * regelmässig mit dem nächsten vollen Pull. Jeder Aufruf führt deshalb neu
 * zusammen, statt auf "schon gesehen" zu setzen.
 *
 * Von Pull und Delta gemeinsam benutzt. Zwei Wege, dieselben Zeilen zu
 * schreiben, wären zwei Gelegenheiten, die Merge-Semantik auseinanderlaufen
 * zu lassen.
 */
export async function applyPulledRows(store: PullStore, rows: PulledRows): Promise<void> {
  for (const list of rows.lists ?? []) {
    await applyList(store.rows, list)
    for (const item of list.items) {
      await applyItem(store.rows, item)
    }
    // Ersetzen und nicht zusammenführen: Wer aus der Liste entfernt wurde,
    // taucht in der Antwort schlicht nicht mehr auf (siehe
    // `replaceListMembers` in `app/db/repositories.ts`).
    await store.replaceMembers(list.id, list.members)
  }

  for (const item of rows.items ?? []) {
    await applyItem(store.rows, item)
  }

  for (const recipe of rows.recipes ?? []) {
    await applyRecipe(store.rows, recipe)
    for (const ingredient of recipe.ingredients) {
      await applyIngredient(store.rows, ingredient)
    }
    for (const step of recipe.steps) {
      await applyStep(store.rows, step)
    }
    for (const message of recipe.chatMessages) {
      await applyChatMessage(store.rows, message)
    }
  }

  for (const badge of rows.badges ?? []) {
    await applyBadge(store.rows, badge)
  }

  // Historie: append-only, deshalb kein Merge — eingefügt wird nur, was
  // lokal fehlt (siehe putPulledHistoryEntry). Danach wird jeder berührte
  // Parent auf 50 gekappt, der Spiegel des Server-Trims: Ohne ihn wüchse
  // die lokale Menge über das hinaus, was der Server je wieder liefert.
  const touchedHistoryParents = new Set<string>()
  for (const entry of rows.historyEntries ?? []) {
    await store.putPulledHistoryEntry(entry)
    touchedHistoryParents.add(entry.parentId)
  }
  for (const parentId of touchedHistoryParents) {
    await store.trimHistoryForParent(parentId)
  }
}

/**
 * Holt die Antwort des Servers. `since === null` heisst voller Pull.
 *
 * `pageToken` setzt eine gekappte Antwort fort (siehe `lib/pull-page.ts` der
 * API). Ohne ihn beginnt der Server von vorn.
 */
export type PullFetcher = (since: IsoUtc | null, pageToken?: string) => Promise<unknown>

/**
 * Wie viele Seiten ein einzelner Pull höchstens holt.
 *
 * Reine Schranke gegen einen Server, der immer weiter Seiten meldet — ohne sie
 * hinge die App in einer Endlosschleife statt einen unvollständigen Stand zu
 * melden. Bei 5000 Zeilen je Seite sind das 250.000 Zeilen in einem Lauf; wer
 * das erreicht, hat ein anderes Problem als eine fehlende Seite.
 */
export const MAX_PULL_PAGES = 50

export interface PullOutcome {
  /** Das Wasserzeichen, mit dem gefragt wurde. */
  since: IsoUtc | null
  serverTime: IsoUtc | null
  truncated: boolean
  /** Wurde das Wasserzeichen vorgerückt? Bei einer unvollständigen Antwort niemals. */
  cursorAdvanced: boolean
  /** Wie viele Seiten dieser Lauf geholt hat. Normalfall: 1. */
  pages: number
  lists: number
  recipes: number
  badges: number
  /**
   * Wie viele Listen die Antwort als entzogen gemeldet hat. Nicht jede davon
   * lag hier noch: Dieselbe Id kann wegen der Cursor-Überlappung mehrfach
   * kommen, das Entfernen ist idempotent.
   */
  revokedLists: number
  pendingInvites: PendingInvite[]
  /** Bis hierher ist dieses Gerät jetzt auf dem Stand. `null` = unbekannt. */
  changeSeq: number | null
  changes: PullChanges | null
}

export async function runPull(
  store: PullStore & ListRemovalStore,
  fetchPull: PullFetcher,
): Promise<PullOutcome> {
  const since = await store.readCursor()

  /*
   * ÜBER DIE SEITEN LAUFEN, NICHT NUR DIE ERSTE HOLEN.
   *
   * Erreicht eine Abfrage die Obergrenze des Servers, meldet er `truncated` und
   * liefert ein Fortsetzungstoken. Ohne diese Schleife bliebe es beim alten
   * Verhalten: Cursor steht, nächster Pull holt dieselbe erste Seite, und das
   * Konto sieht nie wieder etwas Neues — ein sicherer Stillstand, den nichts
   * als Fehler meldet.
   *
   * Der Cursor rückt erst NACH der letzten Seite vor. Bricht es dazwischen ab,
   * bleibt er stehen und der nächste Lauf beginnt von vorn; der Merge ist
   * idempotent, das kostet nur Arbeit.
   */
  let pageToken: string | undefined
  let seiten = 0
  let letzte: PullResponse | null = null
  let lists = 0
  let recipes = 0
  let badges = 0
  let revokedLists = 0
  const pendingInvites: PendingInvite[] = []

  do {
    const response = parsePullResponse(await fetchPull(since, pageToken))
    letzte = response
    seiten += 1

    await applyPulledRows(store, response)

    // Nach dem Anwenden und nicht davor: Nennt eine Antwort dieselbe Liste
    // wider Erwarten in beiden Mengen, gewinnt der Entzug. Das ist die sichere
    // Richtung — eine fälschlich entfernte Liste holt der nächste volle Pull
    // zurück, eine fälschlich behaltene bliebe für immer stehen.
    //
    // DER HARTE WEG, ohne `deletedAt`: Ein Grabstein ginge beim nächsten Push
    // als Löschabsicht hinaus und zerstörte die Liste für die übrigen
    // Mitglieder, obwohl nur dieses Konto sie nicht mehr sieht (siehe
    // `hardDeleteList` in `app/db/repositories.ts`).
    //
    // Auch bei `truncated` ausgeführt: Eine gekappte Antwort ist unvollständig,
    // aber was sie sagt, stimmt. Nur das Wasserzeichen bleibt dann stehen.
    for (const listId of response.revokedListIds) {
      await store.removeList(listId)
    }

    lists += response.lists.length
    recipes += response.recipes.length
    badges += response.badges.length
    revokedLists += response.revokedListIds.length
    // Die letzte Seite gewinnt nicht: Offene Einladungen kommen nur auf der
    // Seite, auf der sie noch offen waren, und eine spätere leere Menge würde
    // sie sonst wieder verschlucken.
    pendingInvites.push(...response.pendingInvites)

    pageToken = response.nextPageToken ?? undefined
  } while (pageToken !== undefined && seiten < MAX_PULL_PAGES)

  const unvollstaendig = pageToken !== undefined || letzte.truncated

  // Erst schreiben, dann vorrücken: Ein Abbruch mitten im Anwenden lässt das
  // Wasserzeichen stehen, und der nächste Pull holt dieselbe Menge erneut.
  // Das ist genau die Eigenschaft, die den Merge idempotent machen muss.
  let cursorAdvanced = false
  if (!unvollstaendig && letzte.serverTime !== null) {
    await store.writeCursor(letzte.serverTime)
    cursorAdvanced = true
  }

  /*
   * Die Änderungsnummer wird zusammen mit dem Wasserzeichen fortgeschrieben —
   * und nur dann.
   *
   * Ist die Antwort unvollständig, hiesse die Nummer trotzdem zu übernehmen:
   * "Ich bin auf diesem Stand", obwohl es nicht stimmt. Der nächste Herzschlag
   * sähe dann keine Lücke mehr und die fehlenden Zeilen kämen erst beim
   * planmässigen Abgleich — genau die stille Verzögerung, die die Nummer
   * abschaffen soll.
   */
  if (cursorAdvanced && letzte.changeSeq !== null) {
    await store.writeChangeSeq(letzte.changeSeq)
  }

  return {
    since,
    serverTime: letzte.serverTime,
    truncated: unvollstaendig,
    changeSeq: letzte.changeSeq,
    cursorAdvanced,
    pages: seiten,
    lists,
    recipes,
    badges,
    revokedLists,
    pendingInvites,
    changes: letzte.changes,
  }
}
