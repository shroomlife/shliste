import type { ListRow } from '../db/schema'
import { getItemsForList, getListsForView, upsertList } from '../db/repositories'
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
  const entries = useState<ListWithCounts[]>('lists', () => [])
  const isLoading = useState<boolean>('lists-loading', () => false)

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
      entries.value = await Promise.all(
        lists.map(async (list) => {
          const items = await getItemsForList(list.id)
          return {
            list,
            openCount: items.filter(item => !item.checked).length,
            doneCount: items.filter(item => item.checked).length,
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
