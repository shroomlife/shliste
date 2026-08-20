import type { ListRow } from '../db/schema'
import { getItemsForList, getListsForView, getMembersForList, upsertList } from '../db/repositories'
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

  const entries = useState<ListWithCounts[]>('lists', () => [])
  const isLoading = useState<boolean>('lists-loading', () => false)

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
      entries.value = await Promise.all(
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

  return {
    entries: readonly(entries),
    isLoading: readonly(isLoading),
    reload,
    createList,
  }
}
