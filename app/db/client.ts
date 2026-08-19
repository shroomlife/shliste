/**
 * Zugriff auf die lokale Datenbank.
 *
 * Genau eine Verbindung pro Browser-Tab: IndexedDB serialisiert Transaktionen
 * je Verbindung. Mehrere Verbindungen desselben Tabs würden nicht schneller
 * arbeiten, sich aber gegenseitig beim Versionswechsel blockieren.
 */
import { openDB, type IDBPDatabase } from 'idb'
import { createSchema, DB_NAME, DB_VERSION, type ShlisteDb } from './schema'

let connection: Promise<IDBPDatabase<ShlisteDb>> | null = null

function open(): Promise<IDBPDatabase<ShlisteDb>> {
  return openDB<ShlisteDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      createSchema(db)
    },

    blocking() {
      // Ein anderer Tab will auf eine neuere Version migrieren und wird von
      // dieser offenen Verbindung blockiert. Wir schliessen sofort, sonst
      // hängt der andere Tab bis zum Schliessen dieses Tabs. Ein Fehler ist
      // hier bedeutungslos: dann gibt es nichts mehr zu schliessen.
      void closeDb().catch(() => undefined)
    },

    terminated() {
      // Der Browser hat die Verbindung abgeräumt (Speicherdruck, Storage
      // gelöscht). Zwischenspeicher leeren, damit der nächste Zugriff neu
      // öffnet statt auf eine tote Verbindung zu schreiben.
      connection = null
    },
  })
}

/**
 * Öffnet die Datenbank beim ersten Aufruf und liefert danach dieselbe
 * Verbindung.
 *
 * Wirft auf dem Server: IndexedDB gibt es dort nicht. Das ist Absicht und
 * kein Nachteil — der App-Bereich rendert laut `routeRules` ohnehin nur im
 * Client. Ein stiller `null`-Rückgabewert würde den Fehler dagegen bis in
 * die aufrufende Komponente tragen, wo er als "keine Daten" missverstanden
 * würde.
 */
export function getDb(): Promise<IDBPDatabase<ShlisteDb>> {
  if (import.meta.server) {
    throw new Error('IndexedDB ist auf dem Server nicht verfügbar. getDb() darf nur im Client aufgerufen werden.')
  }

  if (typeof indexedDB === 'undefined') {
    throw new Error('Dieser Browser stellt keine IndexedDB bereit (privater Modus oder blockierter Speicher).')
  }

  if (connection === null) {
    const pending = open()
    connection = pending

    // Eine gescheiterte Verbindung darf nicht dauerhaft zwischengespeichert
    // bleiben, sonst bleibt die App bis zum Neuladen kaputt. Der Vergleich
    // stellt sicher, dass ein bereits erfolgter Neuaufbau nicht verworfen wird.
    void pending.catch(() => {
      if (connection === pending) {
        connection = null
      }
    })
  }

  return connection
}

/**
 * Schliesst die Verbindung, falls eine offen ist. Der nächste `getDb()`
 * öffnet neu. Gebraucht beim Versionswechsel in einem anderen Tab und beim
 * Zurücksetzen der lokalen Daten.
 */
export async function closeDb(): Promise<void> {
  const pending = connection
  connection = null

  if (pending === null) {
    return
  }

  const db = await pending
  db.close()
}
