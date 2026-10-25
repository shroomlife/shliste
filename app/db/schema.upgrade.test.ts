/**
 * Die Versionssprünge gegen eine echte IndexedDB im Arbeitsspeicher. Geprüft
 * werden `createSchema` und `backfillLinkFields`, genau die Funktionen, die
 * `app/db/client.ts` im Upgrade aufruft.
 */
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { openDB } from 'idb'
import { backfillLinkFields, createSchema, DB_VERSION, type ShlisteDb } from './schema'
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

  expect(v4.version).toBe(DB_VERSION)
  expect(v4.objectStoreNames.contains('sync_recovery')).toBe(true)
  expect(await v4.get('lists', 'l1')).toEqual(listRow('l1', { name: 'Wocheneinkauf' }))
  expect(await v4.get('list_items', 'i1')).toEqual(itemRow('i1', 'l1', { name: 'Milch', dirty: 1 }))
  expect(await v4.get('sync_meta', 'hasMigrated')).toBe(true)
  expect(await v4.getAll('sync_recovery')).toEqual([])
  expect(v4.transaction('sync_recovery').store.indexNames.contains('by-status')).toBe(true)
  v4.close()
})

test('Version 4 mit Bestand: linkPending wird nachgetragen, ohne die Zeile schmutzig zu machen', async () => {
  const name = 'shliste-upgrade-v4'

  // Eine Zeile aus Version 4: alle Link-Felder außer linkPending.
  const { linkPending: _ohne, ...altzeile } = itemRow('i1', 'l1', { name: 'Unruhig bleiben', url: 'https://www.thalia.de/a' })
  const v4 = await openDB<ShlisteDb>(name, 4, {
    upgrade(db) {
      createSchema(db)
    },
  })
  v4.close()
  // Ohne Schema-Typ geöffnet: Nur so lässt sich eine Zeile schreiben, der
  // ein Pflichtfeld fehlt — genau das ist der Bestand vor Version 5.
  const roh = await openDB(name, 4)
  await roh.put('list_items', altzeile)
  roh.close()

  const v5 = await openDB<ShlisteDb>(name, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      createSchema(db)
      void backfillLinkFields(oldVersion, transaction)
    },
  })

  const row = await v5.get('list_items', 'i1')
  expect(row?.linkPending).toBe(false)
  expect(row?.dirty).toBe(altzeile.dirty)
  expect(row?.fieldTimestamps).toEqual(altzeile.fieldTimestamps)
  v5.close()
})
