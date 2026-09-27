/**
 * Der Sprung auf Version 4 gegen eine echte IndexedDB im Arbeitsspeicher:
 * Eine Datenbank mit Bestand aus Version 3 bekommt `sync_recovery` dazu und
 * behält jede Zeile. Geprüft wird `createSchema`, genau die Funktion, die
 * `app/db/client.ts` im Upgrade aufruft.
 */
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { openDB } from 'idb'
import { createSchema, DB_VERSION, type ShlisteDb } from './schema'
import { installInMemoryIndexedDb } from './testing/in-memory-db'
import { itemRow, listRow } from './testing/rows'

let restore: () => void

beforeAll(() => {
  restore = installInMemoryIndexedDb()
})

afterAll(() => {
  restore()
})

test('Version 3 mit Bestand: sync_recovery kommt dazu, keine Zeile geht verloren', async () => {
  const name = 'shliste-upgrade-v3'

  // Version 3 so, wie sie im Browser liegt: alle Stores außer sync_recovery.
  const v3 = await openDB<ShlisteDb>(name, 3, {
    upgrade(db) {
      createSchema(db)
      db.deleteObjectStore('sync_recovery')
    },
  })
  expect(v3.objectStoreNames.contains('sync_recovery')).toBe(false)
  await v3.put('lists', listRow('l1', { name: 'Wocheneinkauf' }))
  await v3.put('list_items', itemRow('i1', 'l1', { name: 'Milch', dirty: 1 }))
  await v3.put('sync_meta', true, 'hasMigrated')
  v3.close()

  const v4 = await openDB<ShlisteDb>(name, DB_VERSION, {
    upgrade(db) {
      createSchema(db)
    },
  })

  expect(v4.version).toBe(4)
  expect(v4.objectStoreNames.contains('sync_recovery')).toBe(true)
  expect(await v4.get('lists', 'l1')).toEqual(listRow('l1', { name: 'Wocheneinkauf' }))
  expect(await v4.get('list_items', 'i1')).toEqual(itemRow('i1', 'l1', { name: 'Milch', dirty: 1 }))
  expect(await v4.get('sync_meta', 'hasMigrated')).toBe(true)
  expect(await v4.getAll('sync_recovery')).toEqual([])
  expect(v4.transaction('sync_recovery').store.indexNames.contains('by-status')).toBe(true)
  v4.close()
})
