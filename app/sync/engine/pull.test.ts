/**
 * Der Vertrag des Pulls.
 *
 * Zwei Eigenschaften tragen alles andere:
 *
 * 1. DER CURSOR RÜCKT BEI `truncated` NICHT VOR. Täte er es, fiele alles
 *    jenseits der Serverobergrenze dauerhaft aus dem Delta-Fenster und fehlte
 *    still für immer.
 * 2. DAS ANWENDEN IST IDEMPOTENT. Der Server liefert bewusst eine Überlappung,
 *    dieselben Zeilen kommen also mehrfach. Ein zweiter Durchlauf muss
 *    denselben Stand ergeben — und darf sich niemals auf "schon gesehen"
 *    verlassen.
 */
import { describe, expect, test } from 'bun:test'
import type { HistoryEntry, IsoUtc, ListMember } from '../../../shared/types/domain'
import type {
  BadgeRow,
  ListItemRow,
  ListRow,
  RecipeChatMessageRow,
  RecipeIngredientRow,
  RecipeRow,
  RecipeStepRow,
} from '../../db/schema'
import { CLEAN, DIRTY } from '../../db/schema'
import type { EntityStore, RowMerge, ListRemovalStore, PullStore, RowStores } from './ports'
import { parsePullResponse, runPull } from './pull'

const OLD: IsoUtc = '2026-01-15T10:00:00.000Z'
const NEW: IsoUtc = '2026-02-20T10:00:00.000Z'
const SERVER_TIME: IsoUtc = '2026-03-01T12:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Attrappen
 * ------------------------------------------------------------------ */

function memoryEntityStore<TRow extends { id: string }>(
  rows: TRow[] = [],
): EntityStore<TRow> & { all: Map<string, TRow>, writes: number } {
  const all = new Map(rows.map(row => [row.id, row]))
  const store = {
    all,
    writes: 0,
    /*
     * Bildet `mutateRow` nach: Lesen, Zusammenführen und Schreiben in einem
     * Zug. Genau diese Unteilbarkeit ist die Zusage, gegen die hier geprüft
     * wird — mit getrenntem read/write wäre der Test blind für das Fenster,
     * in dem eine lokale Eingabe verlorengehen konnte.
     */
    mutate: (id: string, merge: RowMerge<TRow>) => {
      const next = merge(all.get(id))
      if (next !== null) {
        all.set(next.id, next)
        store.writes += 1
      }
      return Promise.resolve()
    },
  }
  return store
}

interface FakePullStore extends PullStore, ListRemovalStore {
  cursor: IsoUtc | null
  members: Map<string, readonly ListMember[]>
  lists: Map<string, ListRow>
  items: Map<string, ListItemRow>
  chatMessages: Map<string, RecipeChatMessageRow>
  itemWrites: () => number
  /** Welche Listen endgültig entfernt wurden, in der Reihenfolge der Aufrufe. */
  removed: string[]
  /** Aufzeichnung statt No-op: was der Pull an Historie übernommen hat. */
  pulledHistory: HistoryEntry[]
  /** Für welche Parents nach dem Pull getrimmt wurde. */
  trimmedHistoryParents: string[]
}

function fakePullStore(options: {
  cursor?: IsoUtc | null
  lists?: ListRow[]
  items?: ListItemRow[]
  chatMessages?: RecipeChatMessageRow[]
} = {}): FakePullStore {
  const listStore = memoryEntityStore<ListRow>(options.lists ?? [])
  const itemStore = memoryEntityStore<ListItemRow>(options.items ?? [])
  const chatStore = memoryEntityStore<RecipeChatMessageRow>(options.chatMessages ?? [])

  const rows: RowStores = {
    lists: listStore,
    items: itemStore,
    recipes: memoryEntityStore<RecipeRow>(),
    ingredients: memoryEntityStore<RecipeIngredientRow>(),
    steps: memoryEntityStore<RecipeStepRow>(),
    badges: memoryEntityStore<BadgeRow>(),
    chatMessages: chatStore,
  }

  const store: FakePullStore = {
    rows,
    cursor: options.cursor ?? null,
    members: new Map<string, readonly ListMember[]>(),
    lists: listStore.all,
    items: itemStore.all,
    chatMessages: chatStore.all,
    itemWrites: () => itemStore.writes,
    removed: [],
    pulledHistory: [],
    trimmedHistoryParents: [],
    putPulledHistoryEntry: (entry) => {
      store.pulledHistory.push(entry)
      return Promise.resolve()
    },
    trimHistoryForParent: (parentId) => {
      store.trimmedHistoryParents.push(parentId)
      return Promise.resolve()
    },
    replaceMembers: (listId, members) => {
      store.members.set(listId, members)
      return Promise.resolve()
    },
    // Wie `hardDeleteList`: Die Zeilen verschwinden, ein Grabstein bleibt
    // nicht zurück.
    removeList: (listId) => {
      store.removed.push(listId)
      store.lists.delete(listId)
      for (const [id, row] of store.items) {
        if (row.listId === listId) store.items.delete(id)
      }
      store.members.delete(listId)
      return Promise.resolve()
    },
    readCursor: () => Promise.resolve(store.cursor),
    // Änderungsnummer: für diese Tests belanglos, aber Teil des Ports.
    readChangeSeq: () => Promise.resolve(null),
    writeChangeSeq: () => Promise.resolve(),
    writeCursor: (value) => {
      store.cursor = value
      return Promise.resolve()
    },
  }

  return store
}

/* ------------------------------------------------------------------ *
 * Serverzeilen als rohes JSON
 * ------------------------------------------------------------------ */

function serverList(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'l1',
    name: 'Server-Liste',
    color: '#123456',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: { name: OLD },
    userId: 'owner-uuid',
    ownerUserId: 'owner-uuid',
    items: [],
    members: [],
    ...overrides,
  }
}

function serverItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'i1',
    listId: 'l1',
    name: 'Server-Item',
    quantity: 2,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: { name: OLD, checked: OLD },
    createdBy: null,
    modifiedBy: null,
    ...overrides,
  }
}

function pullBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lists: [],
    recipes: [],
    badges: [],
    pendingInvites: [],
    revokedListIds: [],
    serverTime: SERVER_TIME,
    truncated: false,
    ...overrides,
  }
}

function localList(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: 'l1',
    name: 'Lokal',
    color: '#123456',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

function localItem(overrides: Partial<ListItemRow> = {}): ListItemRow {
  return {
    id: 'i1',
    listId: 'l1',
    name: 'Lokal',
    quantity: 1,
    checked: false,
    removed: false,
    orderIndex: 0,
    sortKey: null,
    createdBy: null,
    modifiedBy: null,
    createdAt: OLD,
    updatedAt: OLD,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: CLEAN,
    ...overrides,
  }
}

/* ------------------------------------------------------------------ *
 * Einlesen
 * ------------------------------------------------------------------ */

describe('parsePullResponse', () => {
  test('liest Listen mit ihren Items und Mitgliedern', () => {
    const response = parsePullResponse(pullBody({
      lists: [serverList({
        items: [serverItem()],
        members: [{ userId: 'u1', role: 'owner', status: 'accepted', email: 'a@b.de' }],
      })],
    }))

    expect(response.lists).toHaveLength(1)
    expect(response.lists[0]?.items).toHaveLength(1)
    expect(response.lists[0]?.members[0]?.listId).toBe('l1')
    expect(response.lists[0]?.members[0]?.role).toBe('owner')
  })

  test('der Eigentümer wird als ownerUserId ?? userId gelesen', () => {
    // `userId` ist das befristete Duplikat; solange nur es kommt, zählt es.
    const nurUserId = parsePullResponse(pullBody({
      lists: [{ ...serverList(), ownerUserId: undefined }],
    }))

    expect(nurUserId.lists[0]?.ownerUserId).toBe('owner-uuid')
  })

  test('Zeitstempel ohne Millisekunden werden aufgefüllt', () => {
    // Sonst wäre "…00Z" in der Zeichenordnung GRÖSSER als "…00.000Z" und
    // jede Snapshot-Prüfung beim Löschen der Dirty-Flags liefe falsch.
    const response = parsePullResponse(pullBody({
      lists: [serverList({ updatedAt: '2026-01-15T10:00:00Z' })],
    }))

    expect(response.lists[0]?.updatedAt).toBe('2026-01-15T10:00:00.000Z')
  })

  test('eine Zeile ohne Pflichtfelder wird verworfen, die übrigen bleiben', () => {
    const response = parsePullResponse(pullBody({
      lists: [serverList(), { id: 'kaputt' }],
    }))

    expect(response.lists).toHaveLength(1)
  })

  test('ein fehlendes truncated gilt als "vollständig"', () => {
    const response = parsePullResponse({ lists: [], serverTime: SERVER_TIME })

    expect(response.truncated).toBe(false)
  })

  test('changes gibt es nur beim inkrementellen Pull', () => {
    expect(parsePullResponse(pullBody()).changes).toBeNull()
    expect(parsePullResponse(pullBody({ changes: { lists: 2, recipes: 1, listItems: 7, badges: 0 } })).changes)
      .toEqual({ lists: 2, recipes: 1, listItems: 7, badges: 0 })
  })

  test('eine unbrauchbare Antwort ergibt eine leere, aber gültige Struktur', () => {
    const response = parsePullResponse('kein objekt')

    expect(response.lists).toEqual([])
    expect(response.serverTime).toBeNull()
    expect(response.truncated).toBe(false)
  })
})

/* ------------------------------------------------------------------ *
 * Der Cursor
 * ------------------------------------------------------------------ */

describe('runPull — Cursor', () => {
  test('fragt mit dem gespeicherten Wasserzeichen', async () => {
    const store = fakePullStore({ cursor: OLD })
    let asked: IsoUtc | null | undefined

    await runPull(store, (since) => {
      asked = since
      return Promise.resolve(pullBody())
    })

    expect(asked).toBe(OLD)
  })

  test('rückt nach einer vollständigen Antwort vor', async () => {
    const store = fakePullStore({ cursor: OLD })

    const outcome = await runPull(store, () => Promise.resolve(pullBody()))

    expect(outcome.cursorAdvanced).toBe(true)
    expect(store.cursor).toBe(SERVER_TIME)
  })

  test('rückt bei truncated NICHT vor', async () => {
    // Sonst fiele alles jenseits der Serverobergrenze dauerhaft aus dem
    // Fenster. Stillstand ist besser als eine unsichtbare Lücke.
    const store = fakePullStore({ cursor: OLD })

    const outcome = await runPull(store, () => Promise.resolve(pullBody({
      lists: [serverList()],
      truncated: true,
    })))

    expect(outcome.truncated).toBe(true)
    expect(outcome.cursorAdvanced).toBe(false)
    expect(store.cursor).toBe(OLD)
    // Die gelieferten Zeilen werden trotzdem übernommen — der inkrementelle
    // Pull ergänzt nur und löscht nichts.
    expect(store.lists.get('l1')?.name).toBe('Server-Liste')
  })

  test('rückt ohne brauchbare serverTime NICHT vor', async () => {
    const store = fakePullStore({ cursor: OLD })

    const outcome = await runPull(store, () => Promise.resolve(pullBody({ serverTime: 'kaputt' })))

    expect(outcome.cursorAdvanced).toBe(false)
    expect(store.cursor).toBe(OLD)
  })

  test('der erste Pull fragt ohne Wasserzeichen', async () => {
    const store = fakePullStore()
    let asked: IsoUtc | null | undefined = OLD

    await runPull(store, (since) => {
      asked = since
      return Promise.resolve(pullBody())
    })

    expect(asked).toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * Anwenden und Zusammenführen
 * ------------------------------------------------------------------ */

describe('runPull — Anwenden', () => {
  test('gepullte Historie wird übernommen und ihr Parent getrimmt', async () => {
    const store = fakePullStore()

    await runPull(store, () => Promise.resolve(pullBody({
      historyEntries: [{
        id: 'h1',
        parentId: 'l1',
        parentType: 'list',
        actionType: 'deleted',
        entityType: 'list_item',
        entityId: 'i1',
        description: 'Milch gelöscht',
        snapshotJson: '{"uuid":"i1","name":"Milch"}',
        createdBy: 'peer-uuid',
        createdAt: OLD,
      }],
    })))

    expect(store.pulledHistory.map(entry => entry.id)).toEqual(['h1'])
    expect(store.pulledHistory[0]?.createdBy).toBe('peer-uuid')
    expect(store.trimmedHistoryParents).toEqual(['l1'])
  })

  test('eine unbekannte Zeile kommt sauber herein', async () => {
    const store = fakePullStore()

    await runPull(store, () => Promise.resolve(pullBody({
      lists: [serverList({ items: [serverItem()] })],
    })))

    expect(store.lists.get('l1')?.dirty).toBe(CLEAN)
    expect(store.items.get('i1')?.name).toBe('Server-Item')
    expect(store.items.get('i1')?.quantity).toBe(2)
  })

  test('eine saubere lokale Zeile wird vom Server überschrieben', async () => {
    const store = fakePullStore({ items: [localItem({ name: 'Alt', dirty: CLEAN })] })

    await runPull(store, () => Promise.resolve(pullBody({
      lists: [serverList({ items: [serverItem()] })],
    })))

    expect(store.items.get('i1')?.name).toBe('Server-Item')
  })

  test('ein schmutziges Feld mit neuerem Stempel gewinnt und bleibt schmutzig', async () => {
    const store = fakePullStore({
      items: [localItem({ name: 'Lokal neuer', dirty: DIRTY, fieldTimestamps: { name: NEW } })],
    })

    await runPull(store, () => Promise.resolve(pullBody({
      lists: [serverList({ items: [serverItem()] })],
    })))

    const merged = store.items.get('i1')
    expect(merged?.name).toBe('Lokal neuer')
    // Der Gewinner muss beim nächsten Push mit — sonst wäre er verloren.
    expect(merged?.dirty).toBe(DIRTY)
    // Felder ohne lokalen Sieg kommen vom Server.
    expect(merged?.quantity).toBe(2)
  })

  test('dieselbe Antwort zweimal anzuwenden ändert nichts', async () => {
    // Der Server liefert bewusst eine Überlappung; doppelte Zeilen sind der
    // Normalfall und dürfen nicht übersprungen werden.
    const store = fakePullStore({
      items: [localItem({ name: 'Lokal neuer', dirty: DIRTY, fieldTimestamps: { name: NEW } })],
    })
    const body = pullBody({ lists: [serverList({ items: [serverItem()] })] })

    await runPull(store, () => Promise.resolve(body))
    const nachErstem = store.items.get('i1')
    const writesBefore = store.itemWrites()

    await runPull(store, () => Promise.resolve(body))

    expect(store.items.get('i1')).toEqual(nachErstem)
    // Der zweite Lauf hat wirklich wieder geschrieben statt zu überspringen.
    expect(store.itemWrites()).toBeGreaterThan(writesBefore)
  })

  test('die Mitglieder einer Liste werden ersetzt, nicht ergänzt', async () => {
    const store = fakePullStore()

    await runPull(store, () => Promise.resolve(pullBody({
      lists: [serverList({
        members: [{ userId: 'u1', role: 'owner', acceptedAt: OLD }],
      })],
    })))

    expect(store.members.get('l1')).toHaveLength(1)
    expect(store.members.get('l1')?.[0]?.status).toBe('accepted')
  })

  test('eine vorhandene Chat-Nachricht wird nicht überschrieben', async () => {
    // Append-only: Sie kann sich nicht geändert haben, und ein Überschreiben
    // löschte nur das Dirty-Flag einer noch ungesendeten Nachricht.
    const store = fakePullStore({
      chatMessages: [{
        id: 'm1',
        recipeId: 'r1',
        role: 'user',
        content: 'lokal',
        createdAt: OLD,
        createdBy: null,
        dirty: DIRTY,
      }],
    })

    await runPull(store, () => Promise.resolve(pullBody({
      recipes: [{
        id: 'r1',
        name: 'Rezept',
        color: '#000000',
        createdAt: OLD,
        updatedAt: OLD,
        chatMessages: [{ id: 'm1', recipeId: 'r1', role: 'user', content: 'server', createdAt: OLD }],
      }],
    })))

    expect(store.chatMessages.get('m1')?.content).toBe('lokal')
    expect(store.chatMessages.get('m1')?.dirty).toBe(DIRTY)
  })
})

/* ------------------------------------------------------------------ *
 * Entzogene Listen
 * ------------------------------------------------------------------ */

describe('runPull — entzogene Listen', () => {
  /**
   * `revokedListIds` nennt Listen, auf die dieses Konto keinen Zugriff mehr
   * hat. Sie stehen in keiner der anderen Mengen — ohne diese Aufzählung
   * erwähnt eine Antwort sie gar nicht mehr, und sie blieben hier für immer
   * sichtbar.
   */
  test('entfernt die genannte Liste samt ihrer Einträge', async () => {
    const store = fakePullStore({
      lists: [localList()],
      items: [localItem()],
    })

    const outcome = await runPull(store, () => Promise.resolve(pullBody({ revokedListIds: ['l1'] })))

    expect(store.removed).toEqual(['l1'])
    expect(store.lists.has('l1')).toBe(false)
    expect(store.items.has('i1')).toBe(false)
    expect(outcome.revokedLists).toBe(1)
  })

  test('nimmt den harten Weg — kein Grabstein bleibt zurück', async () => {
    // Ein lokales `deletedAt` ginge beim nächsten Push als Löschabsicht hinaus
    // und zerstörte die Liste für alle übrigen Mitglieder. Deshalb wird die
    // Zeile entfernt und nicht markiert.
    const store = fakePullStore({ lists: [localList()] })

    await runPull(store, () => Promise.resolve(pullBody({ revokedListIds: ['l1'] })))

    expect(store.lists.get('l1')).toBeUndefined()
  })

  test('ein fehlendes Feld ist kein Fehler', async () => {
    // Der Server kennt es womöglich noch nicht. Der Abgleich darf nicht an der
    // Reihenfolge des Rollouts hängen.
    const store = fakePullStore({ lists: [localList()] })
    const body = pullBody()
    delete body['revokedListIds']

    const outcome = await runPull(store, () => Promise.resolve(body))

    expect(store.removed).toEqual([])
    expect(store.lists.has('l1')).toBe(true)
    expect(outcome.revokedLists).toBe(0)
  })

  test('unbrauchbare Einträge fallen weg, die übrigen wirken', async () => {
    const store = fakePullStore({ lists: [localList()] })

    await runPull(store, () => Promise.resolve(pullBody({
      revokedListIds: ['', 42, null, 'l1'],
    })))

    expect(store.removed).toEqual(['l1'])
  })

  test('eine unbekannte Liste zu entfernen bleibt folgenlos', async () => {
    // Die Antwort überlappt sich mit früheren, dieselbe Id kommt also mehrfach.
    // Der zweite Durchlauf darf nicht anders ausgehen als der erste.
    const store = fakePullStore({ lists: [localList()] })

    await runPull(store, () => Promise.resolve(pullBody({ revokedListIds: ['l1'] })))
    await runPull(store, () => Promise.resolve(pullBody({ revokedListIds: ['l1'] })))

    expect(store.removed).toEqual(['l1', 'l1'])
    expect(store.lists.size).toBe(0)
  })

  test('wirkt auch bei einer gekappten Antwort — nur der Cursor bleibt stehen', async () => {
    // Eine gekappte Antwort ist unvollständig, aber was sie sagt, stimmt.
    const store = fakePullStore({ cursor: OLD, lists: [localList()] })

    const outcome = await runPull(store, () => Promise.resolve(pullBody({
      revokedListIds: ['l1'],
      truncated: true,
    })))

    expect(store.lists.has('l1')).toBe(false)
    expect(outcome.cursorAdvanced).toBe(false)
    expect(store.cursor).toBe(OLD)
  })
})
