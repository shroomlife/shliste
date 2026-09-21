import type { ListItemRow, ListMemberRow, ListRow } from '../db/schema'
import { getItemsForList, getListsForView, getMembersForList, isUnseenForeignChange, upsertItem, upsertList } from '../db/repositories'
import { clampQuantity, isValidItemContent, nextOrderIndex } from './useListDetail'
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
  /** Liest hier jemand anderes mit? Die Regel steht in `isSharedWithOthers`. */
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

/** Eine Mitgliedschaft, reduziert auf das, was die Geteilt-Regel liest. */
type MemberIdentity = Pick<ListMemberRow, 'userId' | 'status'>

/** Die Änderungsspur eines Eintrags — mehr braucht die Fremd-Zählung nicht. */
type ItemChange = Pick<ListItemRow, 'modifiedBy' | 'updatedAt'>

/**
 * Was `reload()` je Liste ablegt: ausschließlich Tatsachen, die NICHT davon
 * abhängen, wer gerade angemeldet ist und was gerade aufleuchtet.
 *
 * WARUM DIE TRENNUNG: Beim Start wird die Sitzung asynchron geholt, die Listen
 * werden sofort gelesen — das Profil ist beim ersten `reload()` also
 * verlässlich noch nicht da. Ein hier eingefrorenes `isShared` wäre die
 * Antwort auf "wer bin ich", bevor sie beantwortet war, und bliebe stehen, bis
 * zufällig ein Abgleich neu lesen lässt. Genauso beim Ab- und Anmelden.
 * Alles Identitätsabhängige entsteht deshalb erst beim Lesen, siehe
 * `deriveListEntry`.
 */
export interface StoredListEntry {
  list: ListRow
  openCount: number
  doneCount: number
  members: readonly MemberIdentity[]
  changes: readonly ItemChange[]
}

/**
 * Liest hier jemand anderes mit?
 *
 * DIE EINE REGEL für "diese Liste ist geteilt" — Gegenstück zu
 * `otherAcceptedMemberCount` in Androids SharedBadge.kt.
 *
 * OHNE BEKANNTE EIGENE IDENTITÄT IST NICHTS GETEILT. Das eigene Konto steht
 * selbst als angenommenes Mitglied in jeder Liste; die API legt es beim ersten
 * Push als `owner` an. Fehlt `ownUserId`, wäre `member.userId !== ownUserId`
 * deshalb für JEDES Mitglied wahr — auch für einen selbst, und jede Liste
 * trüge das Geteilt-Symbol. Lieber einen Moment lang kein Symbol als einen
 * Moment lang ein falsches: Das Symbol ist eine Aussage darüber, wer
 * mitliest.
 *
 * Offene Einladungen zählen nicht. Wer noch nicht bestätigt hat, sieht von der
 * Liste nichts; ihn mitzuzählen würde eine Freigabe behaupten, die es noch
 * nicht gibt. Beide Ausschlüsse stehen in `useLists.test.ts` fest — auf
 * Android sind sie jeweils schon einmal verlorengegangen.
 */
export function isSharedWithOthers(
  members: readonly MemberIdentity[],
  ownUserId: string | null,
): boolean {
  if (ownUserId === null) return false
  return members.some(member => member.status === 'accepted' && member.userId !== ownUserId)
}

/**
 * Reichert einen gespeicherten Eintrag um alles an, was von der aktuellen
 * Anmeldung und vom Aufleuchten abhängt.
 *
 * Getrennt vom Lesen der Datenbank, weil es eine ANDERE Frage beantwortet:
 * `reload()` holt Tatsachen, die für jeden gleich sind; hier entscheidet, wer
 * gerade angemeldet ist. Als reine Funktion, damit genau diese Trennung
 * prüfbar ist, ohne die Oberfläche zu starten.
 */
export function deriveListEntry(
  entry: StoredListEntry,
  ownUserId: string | null,
  isRecentlyChanged: boolean,
): ListWithCounts {
  return {
    list: entry.list,
    openCount: entry.openCount,
    doneCount: entry.doneCount,
    isShared: isSharedWithOthers(entry.members, ownUserId),
    unseenCount: entry.changes.filter(change =>
      isUnseenForeignChange(change, ownUserId, entry.list.seenAt ?? null),
    ).length,
    isRecentlyChanged,
  }
}

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
   * alles Flüchtige lebt, ohne dass die Übersicht dafür die Datenbank neu
   * liest: Das Aufleuchten erlischt nach zwei Sekunden von selbst, und die
   * Anmeldung trifft beim Start erst nach dem ersten `reload()` ein.
   */
  const entries = computed<ListWithCounts[]>(() => {
    const ownUserId = profile.value?.userId ?? null
    return stored.value.map(entry =>
      deriveListEntry(entry, ownUserId, isRecent.value(entry.list.id)),
    )
  })

  async function reload(): Promise<void> {
    // IndexedDB gibt es nur im Browser. Auf dem Server bleibt die Liste leer,
    // was für den App-Bereich folgenlos ist (routeRules: ssr false).
    if (import.meta.server) return

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
            members: members.map(({ userId, status }) => ({ userId, status })),
            // Aus den ohnehin gelesenen Items statt aus einem zweiten
            // Datenbankgang (`countUnseenForeignChanges` liest dieselben
            // Zeilen noch einmal — für Aufrufer, die sie nicht schon in der
            // Hand haben). Nur die beiden Felder, die die Zählung liest.
            changes: items.map(({ modifiedBy, updatedAt }) => ({ modifiedBy, updatedAt })),
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
   * bekämen fünf Zutaten denselben Platz und stünden anschließend in
   * beliebiger Reihenfolge da.
   *
   * @returns die tatsächlich angelegten Zeilen. Die Anzahl steht als
   * `rows.length` darin — und die Ids braucht der Teilen-Empfang, um den
   * neuen Eintrag in der Zielliste hervorzuheben.
   */
  async function addItemsToList(
    listId: string,
    eintraege: readonly { name: string, quantity: number, url?: string | null }[],
  ): Promise<ListItemRow[]> {
    const bestand = [...await getItemsForList(listId)]
    const angelegt: ListItemRow[] = []

    for (const eintrag of eintraege) {
      const name = eintrag.name.trim()
      const url = eintrag.url ?? null
      // Ein leerer Name ist nur mit Adresse ein Eintrag — sonst entstünde eine
      // leere Zeile (siehe `isValidItemContent`).
      if (!isValidItemContent(name, url)) continue

      const row = await upsertItem({
        id: crypto.randomUUID(),
        listId,
        name,
        quantity: clampQuantity(eintrag.quantity),
        checked: false,
        removed: false,
        orderIndex: nextOrderIndex(bestand),
        sortKey: nextSortKey(bestand),
        url,
        createdBy: null,
        modifiedBy: null,
        deletedAt: null,
      })

      bestand.push(row)
      angelegt.push(row)
    }

    if (angelegt.length > 0) await reload()
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
