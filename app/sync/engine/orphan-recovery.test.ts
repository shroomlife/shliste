/**
 * Die Waisenrettung im ganzen Lauf: Engine, Ports und Repository echt, die
 * Datenbank eine echte IndexedDB im Arbeitsspeicher, der Server eine
 * Attrappe mit Zustand.
 *
 * Der Fall aus dem Betrieb: Auf dem Gerät liegen Zeilen, die als
 * synchronisiert gelten, dem Server aber fehlen. Die Selbstheilung zieht
 * alles neu, das allein heilt nichts. Geprüft wird, dass die Waisen gesichert,
 * gleich hochgeladen und nach dem Urteil des Servers eingeordnet werden, ohne
 * dass eine Zeile ohne Kopie verschwindet.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { IDBPDatabase } from 'idb'
import type { IsoUtc, List, ListItem } from '../../../shared/types/domain'
import { DIRTY, type ShlisteDb } from '../../db/schema'
import { installInMemoryIndexedDb, openFreshDb } from '../../db/testing/in-memory-db'
import { itemRow, listRow } from '../../db/testing/rows'
import { computeContentHashes } from '../merge/content-hash'
import { parseList, parseListItem } from './entities'
import { isRecord, readArray } from './json'
import type { RequestOptions } from './transport'

let db: IDBPDatabase<ShlisteDb> | null = null

// Die echte Anbindung (`store.ts`, `repositories.ts`) arbeitet über `getDb()`.
// Hier bekommt sie die Datenbank im Arbeitsspeicher.
mock.module('../../db/client', () => ({
  getDb: () => (db === null ? Promise.reject(new Error('Keine Testdatenbank offen')) : Promise.resolve(db)),
  closeDb: () => Promise.resolve(),
}))

const { localStore } = await import('./store')
const { createSyncEngine } = await import('./sync')
const { createSyncStateStore } = await import('./state')
const repositories = await import('../../db/repositories')

const SERVER_TIME: IsoUtc = '2026-09-27T12:00:00.000Z'
const EARLIER_CURSOR: IsoUtc = '2026-09-20T12:00:00.000Z'

let restore: () => void

beforeAll(() => {
  restore = installInMemoryIndexedDb()
})

afterAll(() => {
  // Der Ersatz für `getDb()` bleibt prozessweit stehen; ohne offene
  // Datenbank verhält er sich wie ohne IndexedDB, er scheitert.
  db?.close()
  db = null
  restore()
})

/** Ohne die lokalen Felder: so, wie der Server die Zeile kennt. */
function serverList(id: string, name: string): List {
  const { dirty: _dirty, ...row } = listRow(id, { name, ownerUserId: 'u1' })
  return row
}

function serverItem(id: string, listId: string, name: string): ListItem {
  const { dirty: _dirty, ...row } = itemRow(id, listId, { name })
  return row
}

/**
 * Ein Server mit Zustand: Er liefert, was er hat, rechnet seinen Hash daraus
 * und nimmt Gepushtes an, sofern `rejects` es nicht verweigert.
 */
function fakeServer(options: { rejects: boolean, onPush?: () => Promise<void> }) {
  const lists = new Map<string, List>([['known', serverList('known', 'Wohnung')]])
  const items = new Map<string, ListItem>([['known-item', serverItem('known-item', 'known', 'Tisch')]])
  const pushes: { lists: string[], items: string[] }[] = []

  const hash = (): string => computeContentHashes({
    lists: [...lists.values()],
    items: [...items.values()],
    recipes: [],
    ingredients: [],
    steps: [],
    badges: [],
  }).v2

  const push = async (body: unknown): Promise<unknown> => {
    const record = isRecord(body) ? body : {}
    const pushedLists = readArray(record, 'lists').map(parseList).filter(row => row !== null)
    const pushedItems = readArray(record, 'listItems').map(parseListItem).filter(row => row !== null)
    pushes.push({ lists: pushedLists.map(row => row.id), items: pushedItems.map(row => row.id) })
    await options.onPush?.()

    if (options.rejects) {
      return {
        conflicts: {},
        skippedIds: { lists: pushedLists.map(row => row.id), listItems: pushedItems.map(row => row.id) },
        serverTime: SERVER_TIME,
      }
    }
    for (const row of pushedLists) lists.set(row.id, row)
    for (const row of pushedItems) items.set(row.id, row)
    return { conflicts: {}, skippedIds: {}, serverTime: SERVER_TIME }
  }

  const request = (path: string, requestOptions?: RequestOptions): Promise<unknown> => {
    const route = path.split('?')[0]
    if (route === '/api/auth/me') return Promise.resolve({ authenticated: true, verified: true, profile: { userId: 'u1' } })
    if (route === '/api/sync/status') {
      return Promise.resolve({ lists: lists.size, recipes: 0, isEmpty: false, contentHash: 'v1', contentHashV2: hash(), lastOverwriteAt: null })
    }
    if (route === '/api/sync/pull') {
      return Promise.resolve({
        lists: [...lists.values()].map(list => ({
          ...list,
          items: [...items.values()].filter(item => item.listId === list.id),
          members: [],
        })),
        recipes: [],
        badges: [],
        pendingInvites: [],
        serverTime: SERVER_TIME,
        truncated: false,
      })
    }
    if (route === '/api/sync/push') return push(requestOptions?.body)
    return Promise.reject(new Error(`Unerwarteter Aufruf: ${path}`))
  }

  return { request, pushes, hash }
}

function engineFor(request: (path: string, options?: RequestOptions) => Promise<unknown>) {
  const state = createSyncStateStore()
  const engine = createSyncEngine({
    store: localStore,
    state,
    request,
    computeLocalContentHashes: async () => computeContentHashes(await repositories.getAllForContentHash()),
    integrity: {
      resetCursor: () => repositories.setLastSyncedAt(null),
      marker: repositories.getSelfHealMarker,
      attempt: repositories.setSelfHealAttempt,
      success: repositories.setSelfHealSuccess,
    },
  })
  return { engine, state }
}

function database(): IDBPDatabase<ShlisteDb> {
  if (db === null) throw new Error('Keine Testdatenbank offen')
  return db
}

beforeEach(async () => {
  db?.close()
  db = await openFreshDb()
  // Ein Bestandsgerät desselben Kontos, zuletzt vor einer Woche abgeglichen.
  await repositories.setHasMigrated(true)
  await repositories.setLastSignedInUserId('u1')
  await repositories.setLastSyncedAt(EARLIER_CURSOR)
  await db.put('lists', listRow('known', { name: 'Wohnung', ownerUserId: 'u1' }))
  await db.put('list_items', itemRow('known-item', 'known', { name: 'Tisch' }))
  // Die Waisen: sauber, aber nie beim Server angekommen.
  await db.put('lists', listRow('orphan', { name: 'Alt', ownerUserId: 'u1' }))
  await db.put('list_items', itemRow('orphan-item', 'orphan', { name: 'Lampe' }))
})

describe('Waisenrettung im Lauf der Selbstheilung', () => {
  test('erkannt, gesichert, hochgeladen, abgelehnt: lokal entfernt, die Kopie bleibt', async () => {
    const server = fakeServer({ rejects: true })
    const { engine, state } = engineFor(server.request)

    await engine.sync()

    // Genau ein Push, und zwar mit den Waisen, im selben Lauf.
    expect(server.pushes).toEqual([{ lists: ['orphan'], items: ['orphan-item'] }])
    expect(await database().get('lists', 'orphan')).toBeUndefined()
    expect(await database().get('list_items', 'orphan-item')).toBeUndefined()

    const list = await database().get('sync_recovery', ['LIST', 'orphan'])
    const item = await database().get('sync_recovery', ['ITEM', 'orphan-item'])
    expect(list?.status).toBe('QUARANTINED')
    expect(list?.payload).toEqual(listRow('orphan', { name: 'Alt', ownerUserId: 'u1' }))
    expect(item?.status).toBe('QUARANTINED')
    // Als Kind der abgelehnten Liste mit dem Stand kurz vor dem Entfernen
    // gesichert, also samt der Markierung zum Hochladen.
    expect(item?.payload).toEqual(itemRow('orphan-item', 'orphan', { name: 'Lampe', dirty: DIRTY }))

    // Danach stimmen die Stände überein, die Heilung ist bestätigt.
    expect(state.get().phase).toBe('idle')
    expect((await repositories.getSelfHealMarker()).hash).toBe(server.hash())
    expect(await repositories.countDirty()).toBe(0)
  })

  test('ein Eintrag, der nach der Erkennung dazukam, wird vor dem Entfernen gesichert', async () => {
    // Während der Push unterwegs ist, legt jemand einen Eintrag in der
    // Waisenliste an. Er war in keinem Push und in keiner Erkennung.
    const server = fakeServer({
      rejects: true,
      onPush: async () => {
        await database().put('list_items', itemRow('late-item', 'orphan', { name: 'Kissen', dirty: DIRTY, updatedAt: SERVER_TIME }))
      },
    })
    const { engine } = engineFor(server.request)

    await engine.sync()

    expect(await database().get('list_items', 'late-item')).toBeUndefined()
    const copy = await database().get('sync_recovery', ['ITEM', 'late-item'])
    expect(copy?.status).toBe('QUARANTINED')
    expect(copy?.payload).toEqual(itemRow('late-item', 'orphan', { name: 'Kissen', dirty: DIRTY, updatedAt: SERVER_TIME }))
  })

  test('angenommen: die Waisen bleiben, sind sauber und gelten als gerettet', async () => {
    const server = fakeServer({ rejects: false })
    const { engine, state } = engineFor(server.request)

    await engine.sync()

    expect(server.pushes).toEqual([{ lists: ['orphan'], items: ['orphan-item'] }])
    expect((await database().get('lists', 'orphan'))?.dirty).toBe(0)
    expect((await database().get('list_items', 'orphan-item'))?.name).toBe('Lampe')
    expect((await database().get('sync_recovery', ['LIST', 'orphan']))?.status).toBe('RESTORED')
    expect((await database().get('sync_recovery', ['ITEM', 'orphan-item']))?.status).toBe('RESTORED')
    expect(state.get().phase).toBe('idle')
  })

  test('"Server übernehmen" lässt die Kopien stehen, sie sind die einzige Spur', async () => {
    const server = fakeServer({ rejects: true })
    const { engine } = engineFor(server.request)
    await engine.sync()

    await localStore.wipeLocalData()

    expect(await database().getAll('lists')).toEqual([])
    expect((await database().getAll('sync_recovery')).map(row => row.status)).toEqual(['QUARANTINED', 'QUARANTINED'])
  })

  test('ein zweiter Lauf lädt nichts erneut hoch', async () => {
    const server = fakeServer({ rejects: true })
    const { engine } = engineFor(server.request)

    await engine.sync()
    await engine.sync()

    expect(server.pushes).toHaveLength(1)
  })
})
