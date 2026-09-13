import { beforeEach, expect, mock, test } from 'bun:test'
import type { ListItemRow, ListRow } from './schema'

let unavailable = false
let secret = false
let failSecondWrite = false
let committed: ListItemRow[] = []
let committedLists: ListRow[] = []
let calls: string[] = []
const parent = { id: 'selected-list', name: 'Mein Einkauf', sourceUrl: 'https://original.example', deletedAt: null }

mock.module('./client', () => ({
  getDb: async () => ({
    transaction(names: string[], mode: string) {
      calls.push(`${names.join(',')}:${mode}`)
      const pending: ListItemRow[] = []
      const pendingLists: ListRow[] = []
      let aborted = false
      return {
        objectStore(name: string) {
          if (name === 'lists') return {
            get: async (id: string) => {
              calls.push(`parent:${id}`)
              return unavailable ? undefined : { ...parent, secret }
            },
            add: async (row: ListRow) => { pendingLists.push(row) },
          }
          return {
            index: () => ({ getAll: async (id: string) => {
              calls.push(`items:${id}`)
              return [...committed]
            } }),
            add: async (row: ListItemRow) => {
              if (failSecondWrite && pending.length === 1) throw new Error('Speicher voll')
              pending.push(row)
            },
          }
        },
        abort() { aborted = true },
        get done() {
          if (aborted) return Promise.reject(new Error('aborted'))
          committed.push(...pending.splice(0))
          committedLists.push(...pendingLists.splice(0))
          return Promise.resolve()
        },
      }
    },
  }),
}))
const { appendImportedItems, createImportedList } = await import('./repositories')

beforeEach(() => {
  unavailable = false
  secret = false
  failSecondWrite = false
  calls = []
  committed = []
  committedLists = []
})

test('ergänzt nur die ausgewählte Liste atomar mit Sync-Metadaten und Reihenfolge', async () => {
  await appendImportedItems('selected-list', [{ name: 'Vorhanden', quantity: 2 }])
  const old = structuredClone(committed[0])
  const count = await appendImportedItems('selected-list', [{ name: 'Milch', quantity: 1 }, { name: 'Brot', quantity: 3 }])
  expect(count).toBe(2)
  expect(committed[0]).toEqual(old)
  expect(committed.map(row => row.name)).toEqual(['Vorhanden', 'Milch', 'Brot'])
  expect(committed.map(row => row.orderIndex)).toEqual([0, 1, 2])
  expect(new Set(committed.map(row => row.sortKey)).size).toBe(3)
  expect(committed.every(row => row.listId === 'selected-list' && row.dirty === 1 && row.fieldTimestamps?.name)).toBe(true)
  expect(parent.name).toBe('Mein Einkauf')
  expect(parent.sourceUrl).toBe('https://original.example')
  expect(calls.slice(-3)).toEqual(['lists,list_items:readwrite', 'parent:selected-list', 'items:selected-list'])
})

test('entfernte und gesperrte Ziele erhalten keine Einträge', async () => {
  unavailable = true
  await expect(appendImportedItems('selected-list', [{ name: 'Milch', quantity: 1 }])).rejects.toThrow('nicht mehr verfügbar')
  unavailable = false
  secret = true
  await expect(appendImportedItems('selected-list', [{ name: 'Milch', quantity: 1 }])).rejects.toThrow('nicht mehr verfügbar')
  expect(committed).toHaveLength(0)
})

test('Schreibfehler hinterlassen keinen halben Import für einen doppelten Retry', async () => {
  failSecondWrite = true
  const selection = [{ name: 'Milch', quantity: 1 }, { name: 'Brot', quantity: 1 }]
  await expect(appendImportedItems('selected-list', selection)).rejects.toThrow('Speicher voll')
  expect(committed).toHaveLength(0)
  failSecondWrite = false
  await appendImportedItems('selected-list', selection)
  expect(committed).toHaveLength(2)
})

test('neue Liste, Quelle und alle Einträge gehören zu derselben Transaktion', async () => {
  const created = await createImportedList({
    name: '  Abendessen  ', sourceUrl: 'https://example.org/rezept',
    items: [{ name: 'Tomaten', quantity: 2 }, { name: 'Brot', quantity: 1 }],
  })
  expect(committedLists).toEqual([created])
  expect(created.name).toBe('Abendessen')
  expect(created.sourceUrl).toBe('https://example.org/rezept')
  expect(created.dirty).toBe(1)
  expect(created.fieldTimestamps?.sourceUrl).toBe(created.updatedAt)
  expect(committed.map(row => row.listId)).toEqual([created.id, created.id])
  expect(committed.map(row => row.orderIndex)).toEqual([0, 1])
  expect(calls.filter(call => call.endsWith(':readwrite'))).toHaveLength(1)
})

test('fehlgeschlagene neue Liste hinterlässt weder Elternzeile noch Einträge', async () => {
  const input = {
    name: 'Abendessen', sourceUrl: 'https://example.org/rezept',
    items: [{ name: 'Tomaten', quantity: 2 }, { name: 'Brot', quantity: 1 }],
  }
  failSecondWrite = true
  await expect(createImportedList(input)).rejects.toThrow('Speicher voll')
  expect(committedLists).toHaveLength(0)
  expect(committed).toHaveLength(0)
  failSecondWrite = false
  await createImportedList(input)
  expect(committedLists).toHaveLength(1)
  expect(committed).toHaveLength(2)
})
