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
 */
import type {
  Badge,
  FieldTimestamps,
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
  parseIngredient,
  parseList,
  parseListItem,
  parseMember,
  parsePendingInvite,
  parseRecipe,
  parseStep,
} from './entities'
import { isRecord, parseAll, readArray, readBooleanOr, readIso, readNumberOr } from './json'
import type { PullStore, RowStores } from './ports'

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
  pendingInvites: PendingInvite[]
  /** `null`, wenn der Server keinen brauchbaren Zeitpunkt geliefert hat. */
  serverTime: IsoUtc | null
  truncated: boolean
  changes: PullChanges | null
}

export function parsePullResponse(value: unknown): PullResponse {
  const record = isRecord(value) ? value : {}

  return {
    lists: parseAll(readArray(record, 'lists'), parsePulledList),
    recipes: parseAll(readArray(record, 'recipes'), parsePulledRecipe),
    badges: parseAll(readArray(record, 'badges'), parseBadge),
    pendingInvites: parseAll(readArray(record, 'pendingInvites'), parsePendingInvite),
    serverTime: readIso(record, 'serverTime'),
    // Fehlt das Feld, gilt die Antwort als vollständig — so verhielt sich der
    // Server, bevor es das Feld gab.
    truncated: readBooleanOr(record, 'truncated', false),
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
  const local = await rows.lists.read(server.id)
  const merged = mergePulledEntity('list', toLocalRow(local, listValues), {
    values: listValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.lists.write({
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
  })
}

async function applyItem(rows: RowStores, server: ListItem): Promise<void> {
  const local = await rows.items.read(server.id)
  const merged = mergePulledEntity('listItem', toLocalRow(local, itemValues), {
    values: itemValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.items.write({
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
  })
}

async function applyRecipe(rows: RowStores, server: PulledRecipe): Promise<void> {
  const local = await rows.recipes.read(server.id)
  const merged = mergePulledEntity('recipe', toLocalRow(local, recipeValues), {
    values: recipeValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.recipes.write({
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
  })
}

async function applyIngredient(rows: RowStores, server: RecipeIngredient): Promise<void> {
  const local = await rows.ingredients.read(server.id)
  const merged = mergePulledEntity('recipeIngredient', toLocalRow(local, ingredientValues), {
    values: ingredientValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.ingredients.write({
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
  })
}

async function applyStep(rows: RowStores, server: RecipeStep): Promise<void> {
  const local = await rows.steps.read(server.id)
  const merged = mergePulledEntity('recipeStep', toLocalRow(local, stepValues), {
    values: stepValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.steps.write({
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
  })
}

async function applyBadge(rows: RowStores, server: Badge): Promise<void> {
  const local = await rows.badges.read(server.id)
  const merged = mergePulledEntity('badge', toLocalRow(local, badgeValues), {
    values: badgeValues(server),
    fieldTimestamps: server.fieldTimestamps,
  })
  const values = merged.values

  await rows.badges.write({
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
  const local = await rows.chatMessages.read(server.id)
  if (local !== undefined) return

  await rows.chatMessages.write({ ...server, dirty: CLEAN })
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
}

/**
 * Schreibt gezogene Zeilen in die lokale Datenbank.
 *
 * IDEMPOTENT, UND ZWAR ZWINGEND: Dieselben Zeilen kommen wegen der
 * Cursor-Ueberlappung mehrfach herunter, und ein Delta überschneidet sich
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
}

/** Holt die Antwort des Servers. `since === null` heisst voller Pull. */
export type PullFetcher = (since: IsoUtc | null) => Promise<unknown>

export interface PullOutcome {
  /** Das Wasserzeichen, mit dem gefragt wurde. */
  since: IsoUtc | null
  serverTime: IsoUtc | null
  truncated: boolean
  /** Wurde das Wasserzeichen vorgerückt? Bei `truncated` niemals. */
  cursorAdvanced: boolean
  lists: number
  recipes: number
  badges: number
  pendingInvites: PendingInvite[]
  changes: PullChanges | null
}

export async function runPull(store: PullStore, fetchPull: PullFetcher): Promise<PullOutcome> {
  const since = await store.readCursor()
  const response = parsePullResponse(await fetchPull(since))

  await applyPulledRows(store, response)

  // Erst schreiben, dann vorrücken: Ein Abbruch mitten im Anwenden lässt das
  // Wasserzeichen stehen, und der nächste Pull holt dieselbe Menge erneut.
  // Das ist genau die Eigenschaft, die den Merge idempotent machen muss.
  let cursorAdvanced = false
  if (!response.truncated && response.serverTime !== null) {
    await store.writeCursor(response.serverTime)
    cursorAdvanced = true
  }

  return {
    since,
    serverTime: response.serverTime,
    truncated: response.truncated,
    cursorAdvanced,
    lists: response.lists.length,
    recipes: response.recipes.length,
    badges: response.badges.length,
    pendingInvites: response.pendingInvites,
    changes: response.changes,
  }
}
