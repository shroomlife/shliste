/**
 * Die Orchestrierung.
 *
 * Geprüft werden die Entscheidungen, nicht die Übertragung: Wann läuft ein
 * Import, wann wird zurückgefragt, was passiert bei einem gescheiterten Push,
 * und was macht ein zweiter Aufruf während eines laufenden Abgleichs.
 */
import { describe, expect, test } from 'bun:test'
import type { IsoUtc, ListMember } from '../../../shared/types/domain'
import type {
  BadgeRow,
  ListItemRow,
  ListRow,
  RecipeChatMessageRow,
  RecipeIngredientRow,
  RecipeRow,
  RecipeStepRow,
} from '../../db/schema'
import { DIRTY } from '../../db/schema'
import { SyncError } from './errors'
import type { ConflictStore, DirtyRows, EntityStore, LocalDataCounts, RowStores, SyncStore } from './ports'
import { createSyncStateStore } from './state'
import { createSyncEngine, parseServerStatus, parseSessionState, type SyncRequest } from './sync'

const TS: IsoUtc = '2026-01-15T10:00:00.000Z'
const SERVER_TIME: IsoUtc = '2026-03-01T12:00:00.000Z'

/* ------------------------------------------------------------------ *
 * Attrappen
 * ------------------------------------------------------------------ */

function memoryEntityStore<TRow extends { id: string }>(): EntityStore<TRow> {
  const all = new Map<string, TRow>()
  return {
    read: id => Promise.resolve(all.get(id)),
    write: (row) => {
      all.set(row.id, row)
      return Promise.resolve()
    },
  }
}

function emptyDirty(): DirtyRows {
  return { lists: [], items: [], recipes: [], ingredients: [], steps: [], chatMessages: [], badges: [], historyEntries: [] }
}

function dirtyList(id: string): ListRow {
  return {
    id,
    name: id,
    color: '#abcdef',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    createdAt: TS,
    updatedAt: TS,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: DIRTY,
  }
}

interface FakeSyncStore extends SyncStore, ConflictStore {
  hasMigrated: boolean
  cursor: IsoUtc | null
  pending: number
  /** Mitschrift der Konfliktauflösung. */
  clearedDeleted: number
  wiped: number
  /** Listen, die der Pull als entzogen gemeldet und entfernt hat. */
  removed: string[]
}

function fakeSyncStore(options: {
  hasMigrated?: boolean
  dirty?: Partial<DirtyRows>
  local?: LocalDataCounts
  lastSignedInUserId?: string | null
  pending?: number
} = {}): FakeSyncStore {
  const rows: RowStores = {
    lists: memoryEntityStore<ListRow>(),
    items: memoryEntityStore<ListItemRow>(),
    recipes: memoryEntityStore<RecipeRow>(),
    ingredients: memoryEntityStore<RecipeIngredientRow>(),
    steps: memoryEntityStore<RecipeStepRow>(),
    badges: memoryEntityStore<BadgeRow>(),
    chatMessages: memoryEntityStore<RecipeChatMessageRow>(),
  }

  const store: FakeSyncStore = {
    rows,
    hasMigrated: options.hasMigrated ?? true,
    cursor: null,
    pending: options.pending ?? 0,
    clearedDeleted: 0,
    wiped: 0,
    removed: [],
    readDirty: () => Promise.resolve({ ...emptyDirty(), ...options.dirty }),
    clearDirty: () => Promise.resolve(),
    putPulledHistoryEntry: () => Promise.resolve(),
    trimHistoryForParent: () => Promise.resolve(),
    replaceMembers: (_listId: string, _members: readonly ListMember[]) => Promise.resolve(),
    readCursor: () => Promise.resolve(store.cursor),
    writeCursor: (value) => {
      store.cursor = value
      return Promise.resolve()
    },
    readHasMigrated: () => Promise.resolve(store.hasMigrated),
    writeHasMigrated: (value) => {
      store.hasMigrated = value
      return Promise.resolve()
    },
    readLastSignedInUserId: () => Promise.resolve(options.lastSignedInUserId ?? null),
    countLocalData: () => Promise.resolve(options.local ?? { lists: 0, recipes: 0 }),
    countPending: () => Promise.resolve(store.pending),
    clearDirtyOnDeleted: () => {
      store.clearedDeleted += 1
      return Promise.resolve(0)
    },
    wipeLocalData: () => {
      store.wiped += 1
      store.cursor = null
      return Promise.resolve()
    },
    removeList: (listId) => {
      store.removed.push(listId)
      return Promise.resolve()
    },
  }

  return store
}

const SESSION = { authenticated: true, verified: true, profile: { userId: 'u1' } }
const EMPTY_SERVER = { lists: 0, recipes: 0, isEmpty: true, contentHash: null, lastOverwriteAt: null }
const FILLED_SERVER = { lists: 4, recipes: 2, isEmpty: false, contentHash: 'abc', contentHashV2: 'abc-v2', lastOverwriteAt: null }
const PUSH_OK = { conflicts: {}, skippedIds: {}, serverTime: SERVER_TIME }
const MIGRATE_OK = { migrated: { lists: 1, recipes: 0 }, skippedIds: {}, serverTime: SERVER_TIME }
const PULL_OK = { lists: [], recipes: [], badges: [], pendingInvites: [], serverTime: SERVER_TIME, truncated: false }

/**
 * Beantwortet Anfragen nach Pfad und schreibt mit, wer aufgerufen wurde.
 *
 * Ein nicht hinterlegter Pfad wirft: Ein Test, der eine unerwartete Anfrage
 * auslöst, soll scheitern statt still ein leeres Ergebnis zu bekommen.
 */
function fakeRequest(handlers: Record<string, () => unknown>): SyncRequest & { calls: string[] } {
  const calls: string[] = []

  const request = (path: string): Promise<unknown> => {
    calls.push(path)
    const handler = handlers[path.split('?')[0] ?? path]
    if (handler === undefined) return Promise.reject(new Error(`Unerwarteter Aufruf: ${path}`))

    const result = handler()
    return result instanceof Promise ? result : Promise.resolve(result)
  }

  return Object.assign(request, { calls })
}

function called(request: { calls: string[] }, path: string): boolean {
  return request.calls.some(call => call.split('?')[0] === path)
}

/* ------------------------------------------------------------------ *
 * Der Mutex
 * ------------------------------------------------------------------ */

describe('createSyncEngine — Mutex', () => {
  test('ein zweiter Aufruf während eines Laufs wird verworfen', async () => {
    // Verworfen und nicht eingereiht: Der laufende Abgleich nimmt ohnehin
    // alles mit, was zum Zeitpunkt seines Snapshots offen war.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const request = fakeRequest({
      '/api/auth/me': async () => {
        await gate
        return SESSION
      },
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })

    const engine = createSyncEngine({ store: fakeSyncStore(), state: createSyncStateStore(), request })

    const first = engine.sync()
    expect(engine.isRunning()).toBe(true)

    const second = await engine.sync()
    expect(second.ran).toBe(false)

    release()
    const finished = await first

    expect(finished.ran).toBe(true)
    expect(engine.isRunning()).toBe(false)
    // Der verworfene Aufruf hat wirklich nichts getan.
    expect(request.calls.filter(call => call === '/api/auth/me')).toHaveLength(1)
  })

  test('nach dem Lauf ist der Mutex wieder frei — auch nach einem Fehler', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => {
        throw new SyncError('kaputt', { kind: 'transient', status: 503 })
      },
    })
    const engine = createSyncEngine({ store: fakeSyncStore(), state: createSyncStateStore(), request })

    await engine.sync()

    expect(engine.isRunning()).toBe(false)
    expect((await engine.sync()).ran).toBe(true)
  })
})

/* ------------------------------------------------------------------ *
 * Sitzung
 * ------------------------------------------------------------------ */

describe('createSyncEngine — Sitzung', () => {
  test('ohne Anmeldung wird nichts weiter versucht', async () => {
    const request = fakeRequest({ '/api/auth/me': () => ({ authenticated: false, verified: true, profile: null }) })
    const state = createSyncStateStore()

    await createSyncEngine({ store: fakeSyncStore(), state, request }).sync()

    expect(state.get().phase).toBe('authRequired')
    expect(called(request, '/api/sync/pull')).toBe(false)
    expect(called(request, '/api/sync/push')).toBe(false)
  })

  test('ein Netzwerkfehler meldet offline, nicht "Fehler"', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    const state = createSyncStateStore()

    await createSyncEngine({ store: fakeSyncStore(), state, request }).sync()

    expect(state.get().phase).toBe('offline')
  })
})

/* ------------------------------------------------------------------ *
 * Der erste Abgleich
 * ------------------------------------------------------------------ */

describe('createSyncEngine — erster Abgleich', () => {
  test('Server leer und lokale Daten vorhanden: Import statt Push', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/status': () => EMPTY_SERVER,
      '/api/sync/migrate': () => MIGRATE_OK,
    })
    const store = fakeSyncStore({
      hasMigrated: false,
      local: { lists: 1, recipes: 0 },
      dirty: { lists: [dirtyList('l1')] },
    })

    await createSyncEngine({ store, state: createSyncStateStore(), request }).sync()

    expect(called(request, '/api/sync/migrate')).toBe(true)
    expect(called(request, '/api/sync/push')).toBe(false)
    // Nach dem Import steht alles Lokale auf dem Server; ein Pull holte nur
    // die eigenen Zeilen zurück.
    expect(called(request, '/api/sync/pull')).toBe(false)
    expect(store.hasMigrated).toBe(true)
  })

  test('beide Seiten haben Daten und der Nutzer ist unbekannt: Rückfrage', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/status': () => FILLED_SERVER,
    })
    const store = fakeSyncStore({ hasMigrated: false, local: { lists: 3, recipes: 1 } })
    const state = createSyncStateStore()

    await createSyncEngine({ store, state, request }).sync()

    expect(state.get().phase).toBe('error')
    expect(state.get().conflict?.server.lists).toBe(4)
    expect(state.get().conflict?.local.lists).toBe(3)
    // Ohne Entscheidung wird nichts geschrieben und nichts geholt.
    expect(called(request, '/api/sync/pull')).toBe(false)
    expect(store.hasMigrated).toBe(false)
  })

  test('derselbe Nutzer meldet sich erneut an: zusammenführen ohne Rückfrage', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/status': () => FILLED_SERVER,
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({
      hasMigrated: false,
      local: { lists: 3, recipes: 1 },
      lastSignedInUserId: 'u1',
      dirty: { lists: [dirtyList('l1')] },
    })
    const state = createSyncStateStore()

    await createSyncEngine({ store, state, request }).sync()

    expect(called(request, '/api/sync/push')).toBe(true)
    expect(called(request, '/api/sync/pull')).toBe(true)
    expect(state.get().conflict).toBeNull()
    expect(store.hasMigrated).toBe(true)
  })

  test('gleiche Prüfsumme führt ebenfalls ohne Rückfrage zusammen', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/status': () => FILLED_SERVER,
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ hasMigrated: false, local: { lists: 3, recipes: 1 } })
    const state = createSyncStateStore()

    await createSyncEngine({
      store,
      state,
      request,
      // V2, nicht V1: Die ältere Fassung hängt Zeilen-Zeitstempel an und
      // weicht unter feldgenauem Merge zu Recht ab.
      computeLocalContentHashes: () => Promise.resolve({
        v2: 'abc-v2',
        parts: {
          lists: '', listItems: '', recipes: '',
          recipeIngredients: '', recipeSteps: '', badges: '',
        },
      }),
    }).sync()

    expect(state.get().conflict).toBeNull()
    expect(called(request, '/api/sync/pull')).toBe(true)
  })

  test('nur der Server hat Daten: Marker setzen und ziehen', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/status': () => FILLED_SERVER,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ hasMigrated: false, local: { lists: 0, recipes: 0 } })

    await createSyncEngine({ store, state: createSyncStateStore(), request }).sync()

    expect(store.hasMigrated).toBe(true)
    expect(called(request, '/api/sync/push')).toBe(false)
    expect(called(request, '/api/sync/pull')).toBe(true)
  })
})

/* ------------------------------------------------------------------ *
 * Der laufende Betrieb
 * ------------------------------------------------------------------ */

describe('createSyncEngine — Push und Pull', () => {
  test('ein gescheiterter Push verhindert den Pull nicht', async () => {
    // Die lokalen Zeilen bleiben schmutzig und sind nicht verloren. Die
    // Änderungen der anderen Geräte dagegen fehlten, obwohl mit ihnen alles
    // in Ordnung ist.
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/push': () => {
        throw new SyncError('Ungültiger Zeitstempel', { kind: 'permanent', status: 422 })
      },
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ dirty: { lists: [dirtyList('l1')] }, pending: 1 })
    const state = createSyncStateStore()

    await createSyncEngine({ store, state, request }).sync()

    expect(called(request, '/api/sync/pull')).toBe(true)
    expect(store.cursor).toBe(SERVER_TIME)
    // Trotz gelungenem Pull kein "alles gut": Es liegt etwas ungesendet herum.
    expect(state.get().phase).toBe('error')
    expect(state.get().message).toContain('abgelehnt')
  })

  test('eine entzogene Liste aus der Pull-Antwort wird endgültig entfernt', async () => {
    // Der Weg vom Feld `revokedListIds` bis zum harten Löschpfad, einmal
    // durchgezogen: Kein Grabstein, denn der ginge beim nächsten Push als
    // Löschabsicht zurück und zerstörte die Liste für die übrigen Mitglieder.
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => ({ ...PULL_OK, revokedListIds: ['l9'] }),
    })
    const store = fakeSyncStore()

    await createSyncEngine({ store, state: createSyncStateStore(), request }).sync()

    expect(store.removed).toEqual(['l9'])
  })

  test('ein Rate-Limit reicht die Wartezeit an die Oberfläche durch', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/push': () => {
        throw new SyncError('Zu viele Anfragen', { kind: 'rateLimited', status: 429, retryAfterMs: 30_000 })
      },
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ dirty: { lists: [dirtyList('l1')] } })
    const state = createSyncStateStore()

    await createSyncEngine({ store, state, request }).sync()

    expect(state.get().retryAfterMs).toBe(30_000)
  })

  test('nach einem sauberen Lauf ohne offene Zeilen: idle', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/pull': () => PULL_OK,
    })
    const state = createSyncStateStore()

    await createSyncEngine({ store: fakeSyncStore(), state, request }).sync()

    expect(state.get().phase).toBe('idle')
    expect(state.get().lastSyncedAt).toBe(SERVER_TIME)
  })

  test('bleiben Zeilen offen, meldet die Anzeige "pending"', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ dirty: { lists: [dirtyList('l1')] }, pending: 2 })
    const state = createSyncStateStore()

    await createSyncEngine({ store, state, request }).sync()

    expect(state.get().phase).toBe('pending')
    expect(state.get().pendingCount).toBe(2)
  })

  test('das Wasserzeichen geht als since wieder hinaus', async () => {
    const request = fakeRequest({
      '/api/auth/me': () => SESSION,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore()
    store.cursor = TS

    await createSyncEngine({ store, state: createSyncStateStore(), request }).sync()

    expect(request.calls).toContain(`/api/sync/pull?since=${encodeURIComponent(TS)}`)
  })
})

/* ------------------------------------------------------------------ *
 * Konfliktauflösung
 *
 * Der Fall: Beide Seiten haben Daten und die Stände lassen sich nicht
 * beweisen. Die Engine hält dann an und fragt. Was danach passiert, ist eine
 * Entscheidung des Nutzers — und jede der drei hat Folgen, die man nicht
 * versehentlich auslösen darf.
 * ------------------------------------------------------------------ */

describe('resolveConflict', () => {
  test('merge verwirft lokale Löschabsichten und gleicht ab', async () => {
    const request = fakeRequest({
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })
    const store = fakeSyncStore({ hasMigrated: false })

    await createSyncEngine({ store, state: createSyncStateStore(), request }).resolveConflict('merge')

    // Ohne diesen Schritt risse eine offline getroffene Löschung über das
    // feldgenaue Last-Write-Wins den Serverbestand mit.
    expect(store.clearedDeleted).toBe(1)
    expect(store.wiped).toBe(0)
    expect(store.hasMigrated).toBe(true)
    expect(request.calls).toContain('/api/sync/pull')
  })

  test('pullServer löscht lokal und zieht danach vollständig', async () => {
    const request = fakeRequest({ '/api/sync/pull': () => PULL_OK })
    const store = fakeSyncStore({ hasMigrated: false })
    store.cursor = TS

    await createSyncEngine({ store, state: createSyncStateStore(), request }).resolveConflict('pullServer')

    expect(store.wiped).toBe(1)
    // Ohne zurückgesetztes Wasserzeichen käme nur ein Ausschnitt zurück und
    // der Rest fehlte für immer.
    expect(request.calls).toContain('/api/sync/pull')
    expect(store.hasMigrated).toBe(true)
  })

  test('pushLocal lädt den lokalen Bestand hoch', async () => {
    const request = fakeRequest({ '/api/sync/migrate': () => MIGRATE_OK })
    const store = fakeSyncStore({ hasMigrated: false, dirty: { lists: [dirtyList('l1')] } })

    await createSyncEngine({ store, state: createSyncStateStore(), request }).resolveConflict('pushLocal')

    expect(request.calls).toContain('/api/sync/migrate')
    expect(store.wiped).toBe(0)
    expect(store.clearedDeleted).toBe(0)
    expect(store.hasMigrated).toBe(true)
  })

  test('jeder Weg beantwortet die Frage endgültig', async () => {
    // hasMigrated muss danach stehen, sonst fragt der nächste Start erneut.
    for (const strategy of ['merge', 'pushLocal', 'pullServer'] as const) {
      const request = fakeRequest({
        '/api/sync/push': () => PUSH_OK,
        '/api/sync/pull': () => PULL_OK,
        '/api/sync/migrate': () => MIGRATE_OK,
      })
      const store = fakeSyncStore({ hasMigrated: false })

      await createSyncEngine({ store, state: createSyncStateStore(), request }).resolveConflict(strategy)

      expect(store.hasMigrated).toBe(true)
    }
  })

  test('die Konfliktmeldung wird dabei geräumt', async () => {
    const request = fakeRequest({
      '/api/sync/push': () => PUSH_OK,
      '/api/sync/pull': () => PULL_OK,
    })
    const state = createSyncStateStore()
    state.set({ conflict: { server: { lists: 4, recipes: 2, contentHash: null, lastOverwriteAt: null }, local: { lists: 1, recipes: 0 } } })

    await createSyncEngine({ store: fakeSyncStore({ hasMigrated: false }), state, request }).resolveConflict('merge')

    expect(state.get().conflict).toBeNull()
  })

  test('ein Fehler landet im Zustand statt als geworfene Ausnahme', async () => {
    // Kein hinterlegter Pfad: die Attrappe wirft, wie es ein Netzausfall täte.
    const request = fakeRequest({})
    const state = createSyncStateStore()

    const outcome = await createSyncEngine({ store: fakeSyncStore(), state, request })
      .resolveConflict('pullServer')

    // Der Aufrufer bekommt eine Antwort und keine Ausnahme um die Ohren, und
    // die Oberfläche hat einen Satz zum Anzeigen.
    expect(outcome.ran).toBe(true)
    expect(state.get().phase).not.toBe('idle')
    expect(state.get().message).not.toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * Einlesen der Nebenantworten
 * ------------------------------------------------------------------ */

describe('parseServerStatus', () => {
  test('liest die Zähler und die Prüfsumme', () => {
    const status = parseServerStatus(FILLED_SERVER)

    expect(status.lists).toBe(4)
    expect(status.isEmpty).toBe(false)
    expect(status.contentHash).toBe('abc')
  })

  test('ohne isEmpty entscheiden die Zähler', () => {
    expect(parseServerStatus({ lists: 0, recipes: 0 }).isEmpty).toBe(true)
    expect(parseServerStatus({ lists: 1, recipes: 0 }).isEmpty).toBe(false)
  })

  test('eine unbrauchbare Antwort gilt als leeres Konto ohne Prüfsumme', () => {
    const status = parseServerStatus(null)

    expect(status.isEmpty).toBe(true)
    expect(status.contentHash).toBeNull()
  })
})

describe('parseSessionState', () => {
  test('liest Anmeldung und Kennung', () => {
    const session = parseSessionState(SESSION)

    expect(session.authenticated).toBe(true)
    expect(session.userId).toBe('u1')
  })

  test('im Zweifel gilt "nicht angemeldet"', () => {
    expect(parseSessionState({}).authenticated).toBe(false)
    expect(parseSessionState('kaputt').userId).toBeNull()
  })
})
