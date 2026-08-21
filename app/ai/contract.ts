/**
 * Der Antwort-Vertrag der AI-Routen von api.shliste.app.
 *
 * Alles, was über das Netz kommt, ist `unknown` und wird hier an der Kante
 * eingeengt statt gecastet — dieselbe Haltung wie in `app/sync/engine/json.ts`,
 * dessen Helfer diese Datei wiederverwendet. Eine Antwort, die dem Vertrag
 * nicht entspricht, ergibt `null` und nicht ein halb gefülltes Objekt.
 *
 * Die Importe sind relativ und nicht über `~`: Die Parser werden mit
 * `bun test` ohne Nuxt geprüft, und dort gibt es keine Alias-Auflösung
 * (dieselbe Begründung wie in `app/db/timestamps.ts`).
 */
import { isRecord, readArray, readBooleanOr, readNumberOr, readString } from '../sync/engine/json'

/** Ein Eintrag, wie ihn /ai/edit-list und /ai/voice-edit-list zurückgeben. */
export interface EditedListItem {
  /** Index in der mitgeschickten Liste; `null` bedeutet: neuer Eintrag. */
  idx: number | null
  name: string
  quantity: number
  checked: boolean
}

export interface EditedList {
  name: string
  items: EditedListItem[]
}

/** Ein Eintrag, wie ihn voice-to-list, url-to-list und image-to-list liefern. */
export interface GeneratedListItem {
  name: string
  quantity: number
}

export interface GeneratedList {
  name: string
  items: GeneratedListItem[]
  sourceUrl: string | null
}

/**
 * Menge auf das Domänenmodell normalisieren: eine ganze Zahl ab 1.
 *
 * Das Modell darf laut API-Schema jede Zahl liefern; die Domäne (und die
 * Android-App) führen die Menge aber als Stückzahl. Gewichte und Volumen
 * stehen laut System-Prompt der API im Namen, nicht in der Menge.
 */
export function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.round(value))
}

/**
 * Das Fehlerfeld einer AI-Antwort — unabhängig vom HTTP-Status, denn
 * /ai/suggest meldet Fehler sogar mit HTTP 200 im Feld `error`.
 */
export function readAiError(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const error = readString(payload, 'error')
  return error !== null && error.length > 0 ? error : null
}

function parseEditedListItem(value: unknown): EditedListItem | null {
  if (!isRecord(value)) return null

  const name = readString(value, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  const idx = value.idx
  return {
    idx: typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 ? idx : null,
    name,
    quantity: normalizeQuantity(readNumberOr(value, 'quantity', 1)),
    checked: readBooleanOr(value, 'checked', false),
  }
}

/** Antwort von /ai/edit-list und /ai/voice-edit-list: `{list: {name, items}}`. */
export function parseEditedList(payload: unknown): EditedList | null {
  if (!isRecord(payload)) return null
  const list = payload.list
  if (!isRecord(list)) return null

  const name = readString(list, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  const items: EditedListItem[] = []
  for (const raw of readArray(list, 'items')) {
    const item = parseEditedListItem(raw)
    if (item !== null) items.push(item)
  }

  return { name, items }
}

function parseGeneratedListItem(value: unknown): GeneratedListItem | null {
  if (!isRecord(value)) return null

  const name = readString(value, 'name')?.trim() ?? ''
  if (name.length === 0) return null

  return { name, quantity: normalizeQuantity(readNumberOr(value, 'quantity', 1)) }
}

/**
 * Antwort von voice-to-list, url-to-list und image-to-list:
 * `{list: {name, items}, sourceUrl?}`.
 *
 * Eine Liste ohne einen einzigen brauchbaren Eintrag gilt als gescheitert:
 * Was die AI nicht erkannt hat, soll nicht als leere Liste angelegt werden.
 */
export function parseGeneratedList(payload: unknown): GeneratedList | null {
  if (!isRecord(payload)) return null
  const list = payload.list
  if (!isRecord(list)) return null

  const name = readString(list, 'name')?.trim() ?? ''

  const items: GeneratedListItem[] = []
  for (const raw of readArray(list, 'items')) {
    const item = parseGeneratedListItem(raw)
    if (item !== null) items.push(item)
  }

  if (name.length === 0 && items.length === 0) return null

  return {
    name: name.length > 0 ? name : 'Neue Liste',
    items,
    sourceUrl: readString(payload, 'sourceUrl'),
  }
}

/** Antwort von /ai/suggest: `{suggestions: string[]}`. */
export function parseSuggestions(payload: unknown): string[] | null {
  if (!isRecord(payload)) return null
  const value = payload.suggestions
  if (!Array.isArray(value)) return null

  return value.filter((entry): entry is string => typeof entry === 'string')
}
