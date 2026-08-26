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
import { appendHistoryEntry, getItemRow, getItemsForList, getList, upsertItem, upsertList, type ListItemDraft } from '../db/repositories'
import { listItemSnapshotJson } from '../history/snapshot'
import { nextSortKey, planMoveTo } from '../sync/merge/reorder'
import { nowIso } from '../db/timestamps'
import type { ListItemRow, ListRow } from '../db/schema'
import { listItemDisplayName } from '../utils/listItemDisplay'
import { validHttpUrlOrNull } from '../utils/url'

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
 * Bleibt neben dem Sortierschlüssel bestehen: `orderIndex` ist die
 * Rückfallordnung für Zeilen ohne Schlüssel (siehe `compareByManualOrder`),
 * und die kann es weiterhin geben — auf anderen Geräten und in Daten, die vor
 * der Einführung der Schlüssel entstanden sind.
 */
export function nextOrderIndex(items: readonly { readonly orderIndex: number }[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.orderIndex), -1) + 1
}

/** Kleinste sinnvolle Menge — ein Eintrag ohne Stück wäre keiner. */
export const QUANTITY_MIN = 1

/** Obergrenze der Menge — derselbe Wert wie in Androids NumberSliderInput. */
export const QUANTITY_MAX = 999

/**
 * Zieht eine Menge in den gültigen Bereich 1–999.
 *
 * Hier und nicht in jeder Ansicht einzeln: Die Grenzen sind Domänenwissen
 * (SSOT), und jede Stelle, die Mengen entgegennimmt — Bearbeiten-Blatt,
 * Eingabeleiste, AI-Anlage — soll dieselbe Regel anwenden. Nachkommastellen
 * werden abgeschnitten, Unsinn (NaN, Infinity) fällt auf die 1 zurück.
 */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return QUANTITY_MIN
  return Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, Math.trunc(value)))
}

/**
 * Reduziert eine gespeicherte Zeile auf die Felder, die der Aufrufer setzen
 * darf.
 *
 * `createdAt`, `updatedAt`, `fieldTimestamps` und `dirty` führt die
 * Datenbankschicht selbst. Sie beim Schreiben mitzugeben würde das
 * Last-Write-Wins verfälschen, weshalb `Draft<T>` sie gar nicht erst zulässt.
 *
 * Die drei Server-Spiegel fehlen ebenfalls: Sie gehören dem Server, und was
 * lokal mit ihnen passiert, entscheidet `linkFieldsAfterWrite` anhand der
 * Adresse (siehe `db/repositories.ts`).
 */
export function toItemDraft(item: ListItem): ListItemDraft {
  return {
    id: item.id,
    listId: item.listId,
    name: item.name,
    quantity: item.quantity,
    checked: item.checked,
    removed: item.removed,
    orderIndex: item.orderIndex,
    sortKey: item.sortKey,
    url: item.url,
    createdBy: item.createdBy,
    modifiedBy: item.modifiedBy,
    deletedAt: item.deletedAt,
  }
}

/**
 * Darf diese Zeile so gespeichert werden?
 *
 * Ein leerer Name ist erlaubt, aber NUR mit Adresse: Dann zeigt die Liste den
 * Seitentitel oder den Host. Ohne beides bliebe eine leere, tippbare Zeile
 * übrig, die niemand mehr zuordnen kann.
 */
export function isValidItemContent(name: string, url: string | null): boolean {
  return name.trim().length > 0 || url !== null
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
   *
   * Der Sortierschlüssel entsteht sofort und nicht erst beim Umsortieren
   * (Begründung in `nextSortKey`). Seinen Feld-Zeitstempel bekommt er dabei
   * wie jedes andere Feld: `upsertItem` stempelt bei einer neuen Zeile alles,
   * was übergeben wurde (`changedFields` in `db/repositories.ts`).
   */
  async function addItem(
    name: string,
    quantity: number = 1,
    url: string | null = null,
  ): Promise<ListItemRow | null> {
    const trimmed = name.trim()
    const target = list.value
    // Leerer Name UND keine Adresse: Daraus entstünde eine leere, tippbare
    // Zeile, die niemand mehr zuordnen kann.
    if (!isValidItemContent(trimmed, url) || target === null) return null

    const row = await upsertItem({
      id: crypto.randomUUID(),
      listId: target.id,
      name: trimmed,
      quantity: clampQuantity(quantity),
      checked: false,
      removed: false,
      orderIndex: nextOrderIndex(items.value),
      sortKey: nextSortKey(items.value),
      url,
      createdBy: null,
      modifiedBy: null,
      deletedAt: null,
    })

    await reload()
    return row
  }

  /**
   * Ändert Name und/oder Menge eines Eintrags — der Speicherweg des
   * Bearbeiten-Blatts.
   *
   * Der Eintrag wird frisch aus `items` nachgeschlagen: Zwischen dem Öffnen
   * des Blatts und dem Speichern kann der Sync die Zeile verändert haben, und
   * geschrieben werden soll auf dem letzten Stand — nicht auf dem, den das
   * Blatt beim Öffnen gesehen hat. Ist die Zeile inzwischen weg, passiert
   * still nichts.
   *
   * In den Draft wandern nur tatsächlich übergebene Felder; was sich nicht
   * unterscheidet, stempelt `upsertItem` ohnehin nicht neu — so überträgt der
   * Push später genau diese eine Änderung, ohne fremde Felder anzufassen.
   */
  async function updateItem(
    item: ListItem,
    changes: { name?: string, quantity?: number, url?: string | null },
  ): Promise<void> {
    const current = items.value.find(row => row.id === item.id)
    if (current === undefined) return

    const draft = toItemDraft(current)
    // Die Adresse zuerst: Sie entscheidet mit darüber, ob ein leerer Name
    // durchgehen darf.
    if (changes.url !== undefined) draft.url = validHttpUrlOrNull(changes.url)
    if (changes.quantity !== undefined) draft.quantity = clampQuantity(changes.quantity)

    const name = changes.name?.trim()
    if (name !== undefined && isValidItemContent(name, draft.url)) draft.name = name

    // Letzte Verteidigungslinie: Wer die Adresse entfernt, ohne einen Namen
    // zu setzen, hinterliesse eine leere Zeile. Die Oberfläche fängt das schon
    // ab; hier wird still nichts geschrieben statt Unsinn zu speichern.
    if (!isValidItemContent(draft.name, draft.url)) return

    await upsertItem(draft)
    await reload()
  }

  /**
   * Wirft einen Eintrag aus der Liste.
   *
   * `removed` und nicht `deletedAt`: Das ist der weiche Löschmarker der
   * Domäne. Der Eintrag verschwindet aus der Ansicht, bleibt aber als Verlauf
   * für die Vorschläge erhalten und lässt sich per Rückgängig wiederherstellen
   * — dafür genügt es, `removed` wieder auf `false` zu setzen.
   *
   * VOR dem Entfernen kommt die Löschung in den Verlauf — die Zeile existiert
   * dann noch und der Snapshot trägt ihren letzten Stand. Wortlaut und Ablauf
   * wie `removeItemFromList` in Androids ListStore. Das Rückgängig im Toast
   * (`restoreItem`) schreibt bewusst KEINEN Eintrag: Es hebt die Löschung auf,
   * statt eine neue Tat festzuhalten.
   */
  async function removeItem(item: ListItem): Promise<void> {
    await appendHistoryEntry({
      id: crypto.randomUUID(),
      parentId: item.listId,
      parentType: 'list',
      actionType: 'deleted',
      entityType: 'list_item',
      entityId: item.id,
      // Der Anzeigename und nicht `name`: Ein Link-Eintrag heisst lokal "",
      // und "  gelöscht" wäre im Verlauf nicht wiederzuerkennen.
      description: `${listItemDisplayName(item)} gelöscht`,
      snapshotJson: listItemSnapshotJson(item),
      createdBy: null,
      createdAt: nowIso(),
    })
    await upsertItem({ ...toItemDraft(item), removed: true })
    await reload()
  }

  /**
   * Macht ein Entfernen rückgängig.
   *
   * Möglich, weil `removed` ein Schalter ist und kein Löschen: Die Zeile war
   * die ganze Zeit da, nur unsichtbar. Deshalb kommt sie mit ihrer Id, ihrer
   * Position und ihren Feld-Zeitstempeln zurück — und auf anderen Geräten
   * ebenso, weil das Zurücksetzen ein gewöhnliches Feld-Update ist.
   */
  async function restoreItem(item: ListItem): Promise<void> {
    // Frisch aus der Datenbank statt aus dem eingefrorenen Klick-Snapshot:
    // Der Toast steht sechs Sekunden — ändert ein Mitglied währenddessen
    // Menge oder Haken, würde der alte Stand hier jedes Feld mit frischem
    // Stempel überschreiben und die Fremdänderung still gewinnen. So ändert
    // sich genau das eine Feld `removed` (Muster: setStepExplanation).
    const fresh = await getItemRow(item.id)
    const source = fresh ?? item
    await upsertItem({ ...toItemDraft(source), removed: false })
    await reload()
  }

  /**
   * Legt einen Eintrag an eine andere Stelle.
   *
   * `toIndex` ist die Zielposition INNERHALB der angezeigten Gruppe (offen
   * oder erledigt) — Einträge wechseln beim Ziehen nicht die Gruppe, das
   * entscheidet allein das Häkchen. Gerechnet wird trotzdem auf der
   * vollständigen Liste: Die Gruppen sind eine Sache der Anzeige, die
   * Schlüssel gelten geräteübergreifend für die eine Liste (Begründung in
   * `planMoveTo`).
   *
   * Geschrieben wird in aller Regel genau eine Zeile: Der Sortierschlüssel
   * ist ein Bruchindex und entsteht zwischen den beiden neuen Nachbarn. Nur
   * beim allerersten Umsortieren einer Liste bekommen alle Zeilen einen
   * (Begründung in `sync/merge/reorder.ts`).
   */
  async function moveItemTo(itemId: string, toIndex: number): Promise<void> {
    // Der Block, in dem gezogen wurde — offen oder erledigt. `toIndex` zählt
    // darin, und nur darin steigen die Schlüssel an (Begründung in planMoveTo).
    const moved = items.value.find(item => item.id === itemId)
    if (moved === undefined) return
    const group = items.value.filter(item => item.checked === moved.checked)

    const plan = planMoveTo(items.value, group, itemId, toIndex)
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
   * Setzt die Quelle der Liste — die Seite, aus der sie entstanden ist.
   *
   * Wie `renameList` über `upsertList`, damit nur `sourceUrl` einen frischen
   * Zeitstempel bekommt. `null` entfernt die Quelle; ein ungültiger Wert wird
   * abgelehnt und nicht etwa umgeschrieben (siehe `app/utils/url.ts`).
   */
  async function setListSourceUrl(sourceUrl: string | null): Promise<void> {
    const target = list.value
    if (target === null) return

    const next = validHttpUrlOrNull(sourceUrl)
    if (next === target.sourceUrl) return

    await upsertList({
      id: target.id,
      name: target.name,
      color: target.color,
      secret: target.secret,
      lastSuggestedItems: target.lastSuggestedItems,
      sourceUrl: next,
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
    updateItem,
    removeItem,
    restoreItem,
    moveItemTo,
    renameList,
    setListSourceUrl,
    deleteList,
  }
}
