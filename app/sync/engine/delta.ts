/**
 * Der Delta-Abruf: eine einzelne Liste, einzelne Positionen oder ein Rezept.
 *
 * WOZU ES IHN GIBT: Ein Echtzeit-Ereignis sagt "an dieser Liste hat sich etwas
 * geändert". Darauf den gesamten Bestand zu ziehen wäre für den Server wie
 * für das Gerät unverhältnismässig — jedes Abhaken auf einem anderen Gerät
 * löste einen vollen Pull aus. Der Delta-Abruf holt genau das Betroffene.
 *
 * DAS WASSERZEICHEN RÜCKT DABEI NIE VOR. Ein Delta ist ein Ausschnitt und
 * nicht der Serverstand: Würde `lastSyncedAt` danach weiterwandern, fielen
 * alle Änderungen, die im selben Zeitraum an ANDEREN Zeilen passiert sind,
 * dauerhaft aus dem Fenster des nächsten Pulls und fehlten still für immer.
 * Deshalb schreibt diese Datei den Cursor nicht, und deshalb nimmt sie auch
 * `PullStore` und nicht dessen Schreibseite in die Hand.
 *
 * Gegenstück in der API: `api.shliste.app/src/routes/sync/delta.ts`.
 */
import type { ListItem } from '../../../shared/types/domain'
import { parseListItem } from './entities'
import { isRecord, parseAll, readArray } from './json'
import type { PullStore } from './ports'
import {
  applyPulledRows,
  parsePulledList,
  parsePulledRecipe,
  type PulledList,
  type PulledRecipe,
} from './pull'

/* ------------------------------------------------------------------ *
 * Was abgerufen werden kann
 * ------------------------------------------------------------------ */

/**
 * Das Ziel eines Delta-Abrufs.
 *
 * Die drei Formen entsprechen exakt dem `type`-Parameter der API. Als
 * unterschiedene Vereinigung statt als Objekt mit lauter wahlweisen Feldern:
 * so kann kein Aufruf entstehen, der `type=items` ohne `listId` schickt — die
 * API antwortet darauf mit 400.
 */
export type DeltaTarget
  = | { kind: 'list', listId: string }
    | { kind: 'items', listId: string, itemIds: readonly string[] }
    | { kind: 'recipe', recipeId: string }

/**
 * Baut den Abfrageteil der Adresse.
 *
 * `ids` ist kommagetrennt und nicht wiederholt — so liest die API es
 * (`query.ids.split(",")`). Eine leere Id-Menge wird weggelassen, denn ohne
 * `ids` liefert der Server alle Positionen der Liste, und genau das ist bei
 * einem Ereignis ohne deutbare Ids gewollt.
 */
export function deltaQuery(target: DeltaTarget): string {
  const params = new URLSearchParams()

  switch (target.kind) {
    case 'list':
      params.set('type', 'list')
      params.set('listId', target.listId)
      break

    case 'items':
      params.set('type', 'items')
      params.set('listId', target.listId)
      if (target.itemIds.length > 0) params.set('ids', target.itemIds.join(','))
      break

    case 'recipe':
      params.set('type', 'recipe')
      params.set('id', target.recipeId)
      break
  }

  return params.toString()
}

/* ------------------------------------------------------------------ *
 * Die Antwort
 * ------------------------------------------------------------------ */

/**
 * Die Antwort des Delta-Abrufs.
 *
 * Immer alle drei Felder, je nach `type` sind zwei davon leer. Eine Liste
 * bringt ihre Positionen und Mitglieder verschachtelt mit; `items` auf oberster
 * Ebene ist der Fall `type=items`, bei dem es keine Liste dazu gibt.
 *
 * `serverTime` liefert der Server mit, wird hier aber bewusst NICHT gelesen:
 * Es gibt keinen Weg, an dem es richtig wäre, es als Cursor zu benutzen (siehe
 * Kopf dieser Datei), und ein ungenutzt herumliegender Zeitstempel ist eine
 * Einladung, genau das doch zu tun.
 */
export interface DeltaResponse {
  lists: PulledList[]
  items: ListItem[]
  recipes: PulledRecipe[]
}

/**
 * Engt die Antwort ein.
 *
 * Die Verschachtelung ist dieselbe wie beim Pull, deshalb werden dessen Parser
 * benutzt statt eigener. Zwei Parser für dieselbe Form wären zwei
 * Gelegenheiten, unterschiedlich streng zu sein.
 */
export function parseDeltaResponse(value: unknown): DeltaResponse {
  const record = isRecord(value) ? value : {}

  return {
    lists: parseAll(readArray(record, 'lists'), parsePulledList),
    items: parseAll(readArray(record, 'items'), parseListItem),
    recipes: parseAll(readArray(record, 'recipes'), parsePulledRecipe),
  }
}

/* ------------------------------------------------------------------ *
 * Der Ablauf
 * ------------------------------------------------------------------ */

/** Holt die Antwort des Servers zu einem Abfrageteil. */
export type DeltaFetcher = (query: string) => Promise<unknown>

export interface DeltaOutcome {
  target: DeltaTarget
  lists: number
  items: number
  recipes: number
  /** Wurde überhaupt etwas geschrieben? */
  changed: boolean
}

/**
 * Holt ein Delta und führt es lokal zusammen.
 *
 * Eine leere Antwort ist kein Fehler: Sie ist die normale Auskunft "diese
 * Liste gehört dir nicht (mehr)". Der Server antwortet dann mit leeren Feldern
 * statt mit 403, und dieselbe Antwort kommt auch, wenn die Zeile inzwischen
 * gelöscht wurde.
 */
export async function runDelta(
  store: PullStore,
  fetchDelta: DeltaFetcher,
  target: DeltaTarget,
): Promise<DeltaOutcome> {
  const response = parseDeltaResponse(await fetchDelta(deltaQuery(target)))

  await applyPulledRows(store, response)

  const changed = response.lists.length + response.items.length + response.recipes.length > 0
  return {
    target,
    lists: response.lists.length,
    items: response.items.length,
    recipes: response.recipes.length,
    changed,
  }
}
