import type { ListRow } from '~/db/schema'
import { getListsForView, upsertList } from '~/db/repositories'
import { randomListColor } from '~/utils/color'

/**
 * Listenuebersicht aus der lokalen Datenbank.
 *
 * Bewusst kein `useFetch` oder `useAsyncData`: Die Daten liegen offline-first
 * in IndexedDB und nicht hinter einem Endpunkt. Der Abgleich mit dem Server
 * laeuft getrennt und schreibt in dieselbe Datenbank zurueck; danach genuegt
 * ein `reload()`.
 *
 * Die App ist ohne Konto voll benutzbar. Erst fuer Abgleich und Teilen wird
 * eine Anmeldung gebraucht.
 */
export function useLists() {
  const lists = useState<ListRow[]>('lists', () => [])
  const isLoading = useState<boolean>('lists-loading', () => false)

  async function reload(): Promise<void> {
    // IndexedDB gibt es nur im Browser. Auf dem Server bleibt die Liste leer,
    // was fuer den App-Bereich folgenlos ist (routeRules: ssr false).
    if (import.meta.server) return

    isLoading.value = true
    try {
      lists.value = await getListsForView()
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Legt eine Liste an und gibt sie zurueck.
   *
   * Die ID wird clientseitig vergeben — genau wie in der Android-App. Das ist
   * die Voraussetzung dafuer, offline arbeiten zu koennen: ohne serverseitig
   * vergebene Schluessel gaebe es offline keine stabile Identitaet.
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
    lists: readonly(lists),
    isLoading: readonly(isLoading),
    reload,
    createList,
  }
}
