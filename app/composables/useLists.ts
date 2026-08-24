import type { ListRow } from '../db/schema'
import { getItemsForList, getListsForView, getMembersForList, isUnseenForeignChange, upsertItem, upsertList } from '../db/repositories'
import { clampQuantity, nextOrderIndex } from './useListDetail'
import { nextSortKey } from '../sync/merge/reorder'
import { randomListColor } from '../utils/color'

/**
 * Eine Liste samt der Zähler, die die Übersicht anzeigt.
 *
 * Die Zähler stehen bewusst nicht in der Zeile selbst: Sie sind abgeleitet und
 * würden sonst bei jeder Item-Änderung mitgepflegt und synchronisiert werden
 * müssen — eine zweite Wahrheit, die auseinanderlaufen kann.
 */
export interface ListWithCounts {
  list: ListRow
  openCount: number
  doneCount: number
  /**
   * Liest hier jemand anderes mit?
   *
   * Nur angenommene Mitgliedschaften zählen, und das eigene Konto zählt nicht
   * mit — es steht selbst in der Mitgliederliste. Wer eingeladen ist, aber noch
   * nicht bestätigt hat, sieht von der Liste nichts; ihn mitzuzählen würde
   * behaupten, die Liste sei bereits geteilt. Dieselbe Regel wie
   * `otherAcceptedMemberCount` in der Android-App.
   */
  isShared: boolean
  /**
   * Wie viele Einträge jemand anderes geändert hat, seit die Liste zuletzt
   * offen war — gezählt gegen das lokale Gesehen-Wasserzeichen `seenAt`
   * (siehe `isUnseenForeignChange` in `db/repositories.ts`). Beim Öffnen der
   * Liste fällt die Zahl auf null.
   */
  unseenCount: number
  /**
   * Hat gerade eben ein anderes Gerät diese Liste angefasst? Kommt aus
   * `useRecentlyChanged` und erlischt nach zwei Sekunden von selbst — der
   * kurze Aufleucht-Moment der Übersicht.
   */
  isRecentlyChanged: boolean
}

/**
 * Was `reload()` je Liste ablegt. `isRecentlyChanged` fehlt bewusst: Das
 * Aufleuchten erlischt nach zwei Sekunden von selbst, ein beim Laden
 * eingefrorener Wert würde also stehen bleiben, bis zufällig jemand neu lädt.
 * Es wird deshalb erst beim Lesen angereichert (siehe `entries` unten).
 */
type StoredListEntry = Omit<ListWithCounts, 'isRecentlyChanged'>

/**
 * Listenübersicht aus der lokalen Datenbank.
 *
 * Bewusst kein `useFetch` oder `useAsyncData`: Die Daten liegen offline-first
 * in IndexedDB und nicht hinter einem Endpunkt. Der Abgleich mit dem Server
 * läuft getrennt und schreibt in dieselbe Datenbank zurück; danach genügt
 * ein `reload()`.
 *
 * Die App ist ohne Konto voll benutzbar. Erst für Abgleich und Teilen wird
 * eine Anmeldung gebraucht.
 */
export function useLists() {
  const { profile } = useAuth()
  const { isRecent } = useRecentlyChanged()

  const stored = useState<StoredListEntry[]>('lists', () => [])
  const isLoading = useState<boolean>('lists-loading', () => false)

  /**
   * Die Einträge der Übersicht. Ein `computed` statt des rohen Zustands, damit
   * `isRecentlyChanged` lebt: Es hängt am Zeitgeber von `useRecentlyChanged`
   * und muss von selbst wieder erlöschen — ohne dass die Übersicht dafür die
   * Datenbank neu liest.
   */
  const entries = computed<ListWithCounts[]>(() =>
    stored.value.map(entry => ({ ...entry, isRecentlyChanged: isRecent.value(entry.list.id) })),
  )

  async function reload(): Promise<void> {
    // IndexedDB gibt es nur im Browser. Auf dem Server bleibt die Liste leer,
    // was für den App-Bereich folgenlos ist (routeRules: ssr false).
    if (import.meta.server) return

    // Einmal vor der Schleife gelesen: Wer angemeldet ist, ändert sich während
    // eines Durchlaufs nicht, und je Liste danach zu fragen wäre dieselbe
    // Antwort mehrfach.
    const currentUserId = profile.value?.userId ?? null

    isLoading.value = true
    try {
      const lists = await getListsForView()
      // Die Zähler parallel holen: bei wenigen Listen ist das eine Runde
      // statt einer Kette, und IndexedDB verarbeitet die Lesevorgänge ohnehin
      // nebenläufig.
      stored.value = await Promise.all(
        lists.map(async (list) => {
          const [items, members] = await Promise.all([
            getItemsForList(list.id),
            getMembersForList(list.id),
          ])
          return {
            list,
            openCount: items.filter(item => !item.checked).length,
            doneCount: items.filter(item => item.checked).length,
            isShared: members.some(
              member => member.status === 'accepted' && member.userId !== currentUserId,
            ),
            // Über die ohnehin gelesenen Items gezählt statt über einen
            // zweiten Datenbankgang (`countUnseenForeignChanges` liest
            // dieselben Zeilen noch einmal — für Aufrufer, die die Items
            // nicht schon in der Hand haben).
            unseenCount: items.filter(item =>
              isUnseenForeignChange(item, currentUserId, list.seenAt ?? null),
            ).length,
          }
        }),
      )
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Legt eine Liste an und gibt sie zurück.
   *
   * Die ID wird clientseitig vergeben — genau wie in der Android-App. Das ist
   * die Voraussetzung dafür, offline arbeiten zu können: ohne serverseitig
   * vergebene Schlüssel gäbe es offline keine stabile Identität.
   */
  async function createList(name: string): Promise<ListRow> {
    const row = await upsertList({
      id: crypto.randomUUID(),
      name: name.trim(),
      color: randomListColor(),
      secret: false,
      lastSuggestedItems: '',
      sourceUrl: null,
      ownerUserId: null,
      deletedAt: null,
    })
    await reload()
    return row
  }

  /**
   * Hängt mehrere Einträge an eine BELIEBIGE Liste — der Weg vom Rezept in den
   * Einkauf.
   *
   * Das Gegenstück in `useListDetail` kann das nicht: Es arbeitet immer auf der
   * gerade geöffneten Liste, und hier ist das Ziel eine andere.
   *
   * Ordnungswert und Sortierschlüssel werden je Eintrag WEITERGEZÄHLT statt
   * einmal berechnet: Würden alle aus demselben Ausgangsbestand abgeleitet,
   * bekämen fünf Zutaten denselben Platz und stünden anschliessend in
   * beliebiger Reihenfolge da.
   *
   * @returns wie viele Einträge tatsächlich entstanden sind.
   */
  async function addItemsToList(
    listId: string,
    eintraege: readonly { name: string, quantity: number }[],
  ): Promise<number> {
    const bestand = [...await getItemsForList(listId)]
    let angelegt = 0

    for (const eintrag of eintraege) {
      const name = eintrag.name.trim()
      if (name.length === 0) continue

      const row = await upsertItem({
        id: crypto.randomUUID(),
        listId,
        name,
        quantity: clampQuantity(eintrag.quantity),
        checked: false,
        removed: false,
        orderIndex: nextOrderIndex(bestand),
        sortKey: nextSortKey(bestand),
        createdBy: null,
        modifiedBy: null,
        deletedAt: null,
      })

      bestand.push(row)
      angelegt += 1
    }

    if (angelegt > 0) await reload()
    return angelegt
  }

  return {
    entries,
    isLoading: readonly(isLoading),
    reload,
    createList,
    addItemsToList,
  }
}
