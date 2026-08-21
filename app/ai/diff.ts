/**
 * Diff zwischen der aktuellen Liste und dem AI-Vorschlag.
 *
 * Der Algorithmus ist aus der Android-App übernommen (`computeListDiff` in
 * AiEditListSheet.kt), damit beide Clients dieselbe Vorschau zeigen: Das
 * Matching läuft über den `idx`, den die API für beibehaltene Einträge
 * unverändert zurückgibt; Einträge ohne (gültigen) `idx` sind neu, und was
 * im Vorschlag fehlt, wurde entfernt.
 *
 * Reine Funktionen ohne Vue und ohne IndexedDB — direkt mit `bun test`
 * prüfbar (siehe diff.test.ts). Importe deshalb relativ, nicht über `~`.
 */
import type { EditedList, EditedListItem } from './contract'

/** Ein Eintrag der aktuellen Liste, wie ihn das Diff und die Anfrage brauchen. */
export interface DiffSourceItem {
  readonly id: string
  readonly name: string
  readonly quantity: number
  readonly checked: boolean
}

/** Payload-Form von `currentList` für /ai/edit-list und /ai/voice-edit-list. */
export interface CurrentListPayload {
  name: string
  items: { idx: number, name: string, quantity: number, checked: boolean }[]
}

/**
 * Baut die `currentList` der Anfrage. Der `idx` ist die Position im
 * übergebenen Array — GENAU dieses Array muss später auch dem Diff dienen,
 * sonst zeigen die zurückgegebenen Indizes auf die falschen Einträge.
 */
export function buildCurrentListPayload(name: string, items: readonly DiffSourceItem[]): CurrentListPayload {
  return {
    name,
    items: items.map((item, idx) => ({
      idx,
      name: item.name,
      quantity: item.quantity,
      checked: item.checked,
    })),
  }
}

export type ListDiffEntry
  = | { kind: 'added', name: string, quantity: number, checked: boolean }
    | { kind: 'removed', itemId: string, name: string, quantity: number }
    | { kind: 'modified', itemId: string, name: string, oldQuantity: number, newQuantity: number, oldChecked: boolean, newChecked: boolean }
    | { kind: 'renamed', itemId: string, oldName: string, newName: string, oldQuantity: number, newQuantity: number, oldChecked: boolean, newChecked: boolean }
    | { kind: 'unchanged', name: string, quantity: number, checked: boolean }

/** Was „Übernehmen" an die Seite meldet: neuer Listenname plus das Angehakte. */
export interface AiEditApplyPayload {
  name: string
  entries: ListDiffEntry[]
}

/**
 * Vergleicht die gesendete Liste mit dem Vorschlag der AI.
 *
 * `current` muss dasselbe Array sein (Reihenfolge!), aus dem die Anfrage
 * gebaut wurde — der `idx` der Antwort zählt dort hinein. Jeder Index wird
 * höchstens einmal verbraucht: Gibt das Modell denselben `idx` zweimal
 * zurück, gilt der zweite Eintrag als neu statt als zweite Änderung
 * desselben Eintrags.
 */
export function computeListDiff(
  current: readonly DiffSourceItem[],
  proposed: readonly EditedListItem[],
): ListDiffEntry[] {
  const result: ListDiffEntry[] = []
  const matched = new Set<number>()

  for (const proposal of proposed) {
    const idx = proposal.idx
    const match = idx !== null && idx < current.length && !matched.has(idx)
      ? current[idx]
      : undefined

    if (match === undefined) {
      result.push({ kind: 'added', name: proposal.name, quantity: proposal.quantity, checked: proposal.checked })
      continue
    }

    // idx ist hier sicher gültig, sonst wäre match undefined geblieben.
    if (idx !== null) matched.add(idx)

    const nameChanged = normalized(match.name) !== normalized(proposal.name)
    const quantityChanged = match.quantity !== proposal.quantity
    const checkedChanged = match.checked !== proposal.checked

    if (nameChanged) {
      result.push({
        kind: 'renamed',
        itemId: match.id,
        oldName: match.name,
        newName: proposal.name,
        oldQuantity: match.quantity,
        newQuantity: proposal.quantity,
        oldChecked: match.checked,
        newChecked: proposal.checked,
      })
    }
    else if (quantityChanged || checkedChanged) {
      result.push({
        kind: 'modified',
        itemId: match.id,
        name: proposal.name,
        oldQuantity: match.quantity,
        newQuantity: proposal.quantity,
        oldChecked: match.checked,
        newChecked: proposal.checked,
      })
    }
    else {
      result.push({ kind: 'unchanged', name: proposal.name, quantity: proposal.quantity, checked: proposal.checked })
    }
  }

  for (const [index, existing] of current.entries()) {
    if (!matched.has(index)) {
      result.push({ kind: 'removed', itemId: existing.id, name: existing.name, quantity: existing.quantity })
    }
  }

  return result
}

/**
 * Vorauswahl der Vorschau: alles Geänderte an, Unverändertes aus — wie in
 * der Android-App. Zurück kommen die Indizes ins Diff-Array.
 */
export function defaultDiffSelection(diff: readonly ListDiffEntry[]): Set<number> {
  const selection = new Set<number>()
  for (const [index, entry] of diff.entries()) {
    if (entry.kind !== 'unchanged') selection.add(index)
  }
  return selection
}

/** Hat der Vorschlag überhaupt etwas geändert (Einträge oder Listennamen)? */
export function hasEffectiveChanges(diff: readonly ListDiffEntry[], currentName: string, proposal: EditedList): boolean {
  if (proposal.name.trim() !== currentName) return true
  return diff.some(entry => entry.kind !== 'unchanged')
}

function normalized(name: string): string {
  return name.trim().toLowerCase()
}
