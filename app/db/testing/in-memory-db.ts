/**
 * Eine echte IndexedDB im Arbeitsspeicher, für Tests.
 *
 * `fake-indexeddb` setzt die Spezifikation um, samt der Regeln, an denen im
 * Browser die Fehler entstehen: Eine Transaktion committet, sobald nichts
 * mehr aussteht, ein `await` auf etwas anderes als eine Anfrage tötet sie.
 * Eine selbstgebaute Attrappe prüfte genau das nicht.
 *
 * Die Globals werden nur für die Dauer einer Testdatei gesetzt und danach
 * zurückgenommen: Andere Tests verlassen sich darauf, dass es außerhalb eines
 * Browsers keine IndexedDB gibt.
 */
import {
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
  indexedDB,
} from 'fake-indexeddb'
import { openDB, type IDBPDatabase } from 'idb'
import { createSchema, DB_VERSION, type ShlisteDb } from '../schema'

const GLOBALS: Readonly<Record<string, unknown>> = {
  indexedDB,
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
}

/**
 * Setzt die IndexedDB-Globals und liefert die Funktion, die den vorherigen
 * Zustand wiederherstellt. In `beforeAll` rufen, das Ergebnis in `afterAll`.
 */
export function installInMemoryIndexedDb(): () => void {
  const previous = Object.keys(GLOBALS).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)

  for (const [key, value] of Object.entries(GLOBALS)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true, enumerable: false })
  }

  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor === undefined) Reflect.deleteProperty(globalThis, key)
      else Object.defineProperty(globalThis, key, descriptor)
    }
  }
}

let opened = 0

/** Eine frische, leere Datenbank im aktuellen Schema, je Aufruf eine eigene. */
export function openFreshDb(): Promise<IDBPDatabase<ShlisteDb>> {
  opened += 1
  return openDB<ShlisteDb>(`shliste-test-${opened}`, DB_VERSION, {
    upgrade(db) {
      createSchema(db)
    },
  })
}
