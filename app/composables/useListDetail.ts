/**
 * Eine einzelne Liste samt ihrer Einträge aus der lokalen Datenbank.
 *
 * Wie `useLists` bewusst ohne `useFetch`: Die Daten liegen offline-first in
 * IndexedDB und nicht hinter einem Endpunkt. Der Abgleich mit dem Server läuft
 * getrennt davon und schreibt in dieselbe Datenbank zurück; danach genügt hier
 * ein erneutes `load()`.
 *
 * Sämtliche Zugriffe laufen über `db/repositories` — dort und nur dort werden
 * `dirty`, `updatedAt` und die feldgenauen Zeitstempel geführt, die das
 * Last-Write-Wins des Sync braucht.
 *
 * Die Importe sind relativ und nicht über `~`: Die reinen Hilfsfunktionen
 * dieser Datei werden mit `bun test` ohne Nuxt geprüft, und dort gibt es keine
 * Alias-Auflösung (dieselbe Begründung wie in `db/timestamps.ts`).
 */
import type { ListItem } from '../../shared/types/domain'
import { getItemsForList, getList, upsertItem, upsertList, type Draft } from '../db/repositories'
import { planMoveTo } from '../sync/merge/reorder'
import { nowIso } from '../db/timestamps'
import type { ListItemRow, ListRow } from '../db/schema'

/* ------------------------------------------------------------------ *
 * Reine Funktionen — ohne IndexedDB und ohne Vue, deshalb direkt testbar.
 * ------------------------------------------------------------------ */

/** Zwei Gruppen: was noch zu besorgen ist, und was schon im Wagen liegt. */
export interface CheckedGroups<T> {
  open: T[]
  done: T[]
}

/**
 * Offene Einträge zuerst, erledigte danach.
 *
 * `sort` ist laut Sprachnorm stabil, die manuelle Reihenfolge innerhalb beider
 * Gruppen bleibt also genau so erhalten, wie `getItemsForList` sie geliefert
 * hat. Deshalb wird hier nur nach `checked` verglichen und nicht erneut nach
 * Sortierschlüssel — das wäre eine zweite Fassung derselben Regel.
 *
 * Kopiert vor dem Sortieren: `sort` arbeitet auf der Vorlage, und die stammt
 * aus der Datenbankschicht.
 */
export function sortOpenFirst<T extends { readonly checked: boolean }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Number(a.checked) - Number(b.checked))
}

/**
 * Teilt die Einträge in offene und erledigte auf. Die Ansicht zeigt beide
 * Gruppen getrennt, mit einer Überschrift dazwischen.
 */
export function groupByChecked<T extends { readonly checked: boolean }>(items: readonly T[]): CheckedGroups<T> {
  return {
    open: items.filter(item => !item.checked),
    done: items.filter(item => item.checked),
  }
}

/**
 * Der Ordnungswert für einen neuen Eintrag: hinter allen bestehenden.
 *
 * Neue Einträge bekommen keinen Sortierschlüssel (`sortKey: null`) — den
 * vergibt erst das Umsortieren von Hand. `compareByManualOrder` reiht Zeilen
 * ohne Schlüssel nach `orderIndex` ein, und deshalb muss dieser Wert stimmen.
 */
export function nextOrderIndex(items: readonly { readonly orderIndex: number }[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.orderIndex), -1) + 1
}

/**
 * Reduziert eine gespeicherte Zeile auf die Felder, die der Aufrufer setzen
 * darf.
 *
 * `createdAt`, `updatedAt`, `fieldTimestamps` und `dirty` führt die
 * Datenbankschicht selbst. Sie beim Schreiben mitzugeben würde das
 * Last-Write-Wins verfälschen, weshalb `Draft<T>` sie gar nicht erst zulässt.
 */
export function toItemDraft(item: ListItem): Draft<ListItem> {
  return {
    id: item.id,
    listId: item.listId,
    name: item.name,
    quantity: item.quantity,
    checked: item.checked,
    removed: item.removed,
    orderIndex: item.orderIndex,
    sortKey: item.sortKey,
    createdBy: item.createdBy,
    modifiedBy: item.modifiedBy,
    deletedAt: item.deletedAt,
  }
}

/* ------------------------------------------------------------------ *
 * Der Zustand der Ansicht
 * ------------------------------------------------------------------ */

export function useListDetail() {
  const list = useState<ListRow | null>('list-detail', () => null)
  const items = useState<ListItemRow[]>('list-detail-items', () => [])
  const isLoading = useState<boolean>('list-detail-loading', () => false)

  /**
   * Welche Liste zuletzt angefordert wurde.
   *
   * Nötig gegen ein Wettrennen: Auf dem Desktop steht die Detailansicht neben
   * dem Index, ein zweiter Klick kann also einen zweiten `load()` starten,
   * während der erste noch liest. Ohne diesen Vergleich könnte das ältere
   * Ergebnis als letztes eintreffen und die falsche Liste anzeigen.
   */
  const requestedListId = useState<string | null>('list-detail-id', () => null)

  const openItems = computed<ListItemRow[]>(() => groupByChecked(items.value).open)
  const doneItems = computed<ListItemRow[]>(() => groupByChecked(items.value).done)

  /** Liest Liste und Einträge frisch aus der Datenbank. */
  async function load(listId: string): Promise<void> {
    // IndexedDB gibt es nur im Browser. Auf dem Server bleibt die Ansicht leer,
    // was folgenlos ist: Der App-Bereich rendert laut routeRules nur im Client.
    if (import.meta.server) return

    // Beim Wechsel auf eine andere Liste erst leeren, sonst zeigt die Ansicht
    // für einen Moment die Einträge der vorherigen Liste unter dem neuen Namen.
    if (requestedListId.value !== listId) {
      list.value = null
      items.value = []
    }

    requestedListId.value = listId
    isLoading.value = true

    try {
      const [loadedList, loadedItems] = await Promise.all([
        getList(listId),
        getItemsForList(listId),
      ])

      // Zwischenzeitlich wurde eine andere Liste geöffnet: Dieses Ergebnis
      // gehört nicht mehr auf den Schirm.
      if (requestedListId.value !== listId) return

      list.value = loadedList ?? null
      items.value = sortOpenFirst(loadedItems)
    }
    finally {
      isLoading.value = false
    }
  }

  /** Lädt die zuletzt angeforderte Liste erneut. */
  async function reload(): Promise<void> {
    const listId = requestedListId.value
    if (listId === null) return
    await load(listId)
  }

  /**
   * Hakt einen Eintrag ab oder nimmt das Häkchen wieder weg.
   *
   * Geschrieben wird über `upsertItem`, das dabei `dirty`, `updatedAt` und den
   * Zeitstempel des Feldes `checked` setzt. Erst dadurch kann der Push später
   * genau diese eine Änderung übertragen, ohne die übrigen Felder zu
   * überschreiben.
   */
  async function toggleItem(item: ListItem): Promise<void> {
    await upsertItem({ ...toItemDraft(item), checked: !item.checked })
    await reload()
  }

  /**
   * Legt einen Eintrag an.
   *
   * Die ID wird clientseitig vergeben — genau wie in der Android-App. Das ist
   * die Voraussetzung für den Offline-Betrieb: Ohne serverseitig vergebene
   * Schlüssel hätte ein Eintrag ohne Netz keine stabile Identität, und der
   * spätere Abgleich könnte ihn keinem Datensatz zuordnen.
   *
   * Gibt `null` zurück, wenn nichts angelegt wurde: bei leerem Namen und wenn
   * keine Liste geladen ist. Ein Eintrag ohne existierende Liste wäre eine
   * Waise, die beim Push niemandem zuzuordnen wäre.
   */
  async function addItem(name: string, quantity: number = 1): Promise<ListItemRow | null> {
    const trimmed = name.trim()
    const target = list.value
    if (trimmed.length === 0 || target === null) return null

    const row = await upsertItem({
      id: crypto.randomUUID(),
      listId: target.id,
      name: trimmed,
      quantity,
      checked: false,
      removed: false,
      orderIndex: nextOrderIndex(items.value),
      sortKey: null,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  /**
   * Wirft einen Eintrag aus der Liste.
   *
   * `removed` und nicht `deletedAt`: Das ist der weiche Löschmarker der
   * Domäne. Der Eintrag verschwindet aus der Ansicht, bleibt aber als Verlauf
   * für die Vorschläge erhalten und lässt sich per Rückgängig wiederherstellen
   * — dafür genügt es, `removed` wieder auf `false` zu setzen.
   */
  async function removeItem(item: ListItem): Promise<void> {
    await upsertItem({ ...toItemDraft(item), removed: true })
    await reload()
  }

  /**
   * Legt einen Eintrag an eine andere Stelle.
   *
   * `group` ist die angezeigte Gruppe (offen oder erledigt) und `toIndex` die
   * Zielposition darin — Einträge wechseln beim Ziehen nicht die Gruppe, das
   * entscheidet allein das Häkchen.
   *
   * Geschrieben wird in aller Regel genau eine Zeile: Der Sortierschlüssel
   * ist ein Bruchindex und entsteht zwischen den beiden neuen Nachbarn. Nur
   * beim allerersten Umsortieren einer Liste bekommen alle Zeilen einen
   * (Begründung in `sync/merge/reorder.ts`).
   */
  async function moveItemTo(group: readonly ListItemRow[], itemId: string, toIndex: number): Promise<void> {
    const plan = planMoveTo(group, itemId, toIndex)
    if (plan === null) return

    const byId = new Map(items.value.map(row => [row.id, row]))

    for (const entry of [...plan.normalized, plan.moved]) {
      const row = byId.get(entry.id)
      if (row === undefined) continue
      await upsertItem({ ...toItemDraft(row), sortKey: entry.sortKey })
    }

    await reload()
  }

  /**
   * Benennt die Liste um.
   *
   * Über `upsertList`, das dabei nur das Feld `name` neu stempelt — genau
   * dadurch kann der Push später diese eine Änderung übertragen, ohne die
   * Farbe oder das Geheim-Flag eines anderen Geräts zu überschreiben.
   */
  async function renameList(name: string): Promise<void> {
    const target = list.value
    const trimmed = name.trim()
    if (target === null || trimmed.length === 0 || trimmed === target.name) return

    await upsertList({
      id: target.id,
      name: trimmed,
      color: target.color,
      secret: target.secret,
      lastSuggestedItems: target.lastSuggestedItems,
      sourceUrl: target.sourceUrl,
      ownerUserId: target.ownerUserId,
      deletedAt: target.deletedAt,
    })
    await reload()
  }

  /**
   * Löscht die Liste — beziehungsweise verlässt sie.
   *
   * EIN VORGANG FÜR BEIDES, und zwar nicht aus Bequemlichkeit: Der Server
   * entscheidet anhand der Mitgliedschaft, was ein `deletedAt` bedeutet. Vom
   * Eigentümer ist es eine Löschung, von einem Mitglied das Verlassen der
   * Liste (`push.ts` in der API wandelt es um). Eine zweite Route dafür gibt
   * es bewusst nicht.
   *
   * Ein Grabstein und kein Entfernen der Zeile: Ohne ihn erführe der Server
   * nie von der Löschung und brächte die Liste beim nächsten Pull zurück.
   */
  async function deleteList(): Promise<void> {
    const target = list.value
    if (target === null) return

    await upsertList({
      id: target.id,
      name: target.name,
      color: target.color,
      secret: target.secret,
      lastSuggestedItems: target.lastSuggestedItems,
      sourceUrl: target.sourceUrl,
      ownerUserId: target.ownerUserId,
      deletedAt: nowIso(),
    })
  }

  return {
    list: readonly(list),
    items: readonly(items),
    openItems,
    doneItems,
    isLoading: readonly(isLoading),
    load,
    reload,
    toggleItem,
    addItem,
    removeItem,
    moveItemTo,
    renameList,
    deleteList,
  }
}
