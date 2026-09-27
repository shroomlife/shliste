/**
 * Regeln für Waisen: lokale Zeilen, die als synchronisiert gelten
 * (`dirty = 0`), die der Server beim vollen Abruf aber nicht geliefert hat.
 *
 * WARUM ES SIE GIBT: Der Server löscht nie hart, ein voller Abruf liefert
 * auch entfernte Einträge und gelöschte Listen. Fehlt eine Zeile trotzdem, ist
 * sie nie bei ihm angekommen, etwa durch einen alten Fehler, der das Dirty-Flag
 * zu früh gelöscht hat. Der volle Abruf allein kann sie nicht beheben, denn er
 * überschreibt nur und löscht nie. Die Selbstheilung lief deshalb alle zwölf
 * Stunden erneut an, ohne je zu heilen.
 *
 * DER WEG, angelehnt an "Client Reset: recover unsynced changes" aus Realm:
 * Waisen werden gesichert und erneut hochgeladen, der Server entscheidet.
 * Was er annimmt, ist gerettet. Was er ablehnt (fremder Eigentümer, kein
 * Zugriff mehr), verschwindet lokal, die Kopie bleibt in `sync_recovery`.
 * Nichts geht still verloren, und keine Zeile geht zweimal hinaus.
 *
 * Gegenstück: `sync/recovery/OrphanPolicy.kt` der Android-App. Rein, ohne
 * Datenbank und ohne Uhr, damit die Regeln direkt prüfbar sind.
 */

/**
 * Die Tabellen, die in den Inhalts-Hash eingehen, in der Reihenfolge, in der
 * der Server sie braucht: Eltern vor Kindern. Die Namen sind dieselben wie in
 * Android (`SyncTable`), damit eine Kopie auf beiden Seiten gleich heißt.
 */
export const SYNC_TABLES = ['LIST', 'ITEM', 'RECIPE', 'INGREDIENT', 'STEP', 'BADGE'] as const

export type SyncTable = typeof SYNC_TABLES[number]

export interface SyncRowRef {
  readonly table: SyncTable
  readonly id: string
}

/** Ids je Tabelle. Eine fehlende Tabelle heißt: keine Ids. */
export type IdsByTable = Partial<Readonly<Record<SyncTable, ReadonlySet<string>>>>

/**
 * Was der Server bei einem Push verworfen hat, soweit es den Hash betrifft.
 * `SkippedIds` aus `push.ts` passt strukturell hinein.
 */
export interface RejectedIds {
  readonly lists: readonly string[]
  readonly listItems: readonly string[]
  readonly recipes: readonly string[]
  readonly recipeIngredients: readonly string[]
  readonly recipeSteps: readonly string[]
  readonly badges: readonly string[]
}

export interface Settlement {
  readonly restored: readonly SyncRowRef[]
  readonly quarantined: readonly SyncRowRef[]
}

export function isSyncTable(value: string): value is SyncTable {
  return SYNC_TABLES.some(table => table === value)
}

/** Eindeutiger Schlüssel einer Zeile über alle Tabellen, für Mengenvergleiche. */
function refKey(ref: SyncRowRef): string {
  return `${ref.table}:${ref.id}`
}

/**
 * Saubere lokale Zeilen, die der Server nicht geliefert hat, ohne die schon
 * einmal gesicherten. Eltern vor Kindern, innerhalb einer Tabelle nach Id.
 */
export function findOrphans(
  localClean: IdsByTable,
  fromServer: IdsByTable,
  alreadyRecovered: readonly SyncRowRef[],
): SyncRowRef[] {
  const recovered = new Set(alreadyRecovered.map(refKey))

  return SYNC_TABLES.flatMap((table) => {
    const known = fromServer[table] ?? new Set<string>()
    return [...localClean[table] ?? []]
      .filter(id => !known.has(id))
      // Zeichenreihenfolge wie `sorted()` in Kotlin, nicht `localeCompare`.
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map(id => ({ table, id }))
      .filter(ref => !recovered.has(refKey(ref)))
  })
}

/**
 * Ordnet offene Rettungen nach einem Push ein. Nur Zeilen, die in DIESEM
 * Push waren, bekommen ein Urteil; der Rest wartet auf den nächsten.
 */
export function settle(
  pending: readonly SyncRowRef[],
  pushed: readonly SyncRowRef[],
  skipped: RejectedIds,
): Settlement {
  const rejected = new Set(rejectedRefs(skipped).map(refKey))
  const inThisPush = new Set(pushed.map(refKey))
  const decided = pending.filter(ref => inThisPush.has(refKey(ref)))

  return {
    restored: decided.filter(ref => !rejected.has(refKey(ref))),
    quarantined: decided.filter(ref => rejected.has(refKey(ref))),
  }
}

function rejectedRefs(skipped: RejectedIds): SyncRowRef[] {
  const refs = (table: SyncTable, ids: readonly string[]): SyncRowRef[] => ids.map(id => ({ table, id }))
  return [
    ...refs('LIST', skipped.lists),
    ...refs('ITEM', skipped.listItems),
    ...refs('RECIPE', skipped.recipes),
    ...refs('INGREDIENT', skipped.recipeIngredients),
    ...refs('STEP', skipped.recipeSteps),
    ...refs('BADGE', skipped.badges),
  ]
}

/** Die Form einer Pull-Seite, soweit es um Ids geht. `PullResponse` passt hinein. */
export interface PulledIds {
  readonly lists: readonly { readonly id: string, readonly items: readonly { readonly id: string }[] }[]
  readonly recipes: readonly {
    readonly id: string
    readonly ingredients: readonly { readonly id: string }[]
    readonly steps: readonly { readonly id: string }[]
  }[]
  readonly badges: readonly { readonly id: string }[]
}

export interface ServerIdCollector {
  add: (page: PulledIds) => void
  snapshot: () => Record<SyncTable, ReadonlySet<string>>
}

/**
 * Sammelt die Ids, die ein voller Abruf geliefert hat, über alle Seiten.
 *
 * Nur ein VOLLSTÄNDIGER voller Abruf taugt als Vergleich. Ob er das war,
 * entscheidet der Aufrufer anhand des Ergebnisses von `runPull`.
 */
export function createServerIdCollector(): ServerIdCollector {
  const ids: Record<SyncTable, Set<string>> = {
    LIST: new Set(),
    ITEM: new Set(),
    RECIPE: new Set(),
    INGREDIENT: new Set(),
    STEP: new Set(),
    BADGE: new Set(),
  }

  return {
    add(page) {
      for (const list of page.lists) {
        ids.LIST.add(list.id)
        for (const item of list.items) ids.ITEM.add(item.id)
      }
      for (const recipe of page.recipes) {
        ids.RECIPE.add(recipe.id)
        for (const ingredient of recipe.ingredients) ids.INGREDIENT.add(ingredient.id)
        for (const step of recipe.steps) ids.STEP.add(step.id)
      }
      for (const badge of page.badges) ids.BADGE.add(badge.id)
    },
    snapshot: () => ({
      LIST: new Set(ids.LIST),
      ITEM: new Set(ids.ITEM),
      RECIPE: new Set(ids.RECIPE),
      INGREDIENT: new Set(ids.INGREDIENT),
      STEP: new Set(ids.STEP),
      BADGE: new Set(ids.BADGE),
    }),
  }
}
