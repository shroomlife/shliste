/**
 * Der beobachtbare Zustand.
 *
 * Zwei Dinge müssen stimmen: Ein Patch darf nur die genannten Felder ändern
 * (sonst löschte eine Phasenänderung nebenbei den Zeitpunkt des letzten
 * Abgleichs), und die Übersetzung in die Anzeige muss jede Phase abdecken.
 */
import { describe, expect, test } from 'bun:test'
import { SyncError } from './errors'
import {
  INITIAL_SNAPSHOT,
  createSyncStateStore,
  phaseFromError,
  toDisplayState,
  type SyncPhase,
  type SyncSnapshot,
} from './state'

describe('createSyncStateStore', () => {
  test('beginnt im Ausgangszustand', () => {
    expect(createSyncStateStore().get()).toEqual(INITIAL_SNAPSHOT)
  })

  test('ein Patch lässt die übrigen Felder stehen', () => {
    const store = createSyncStateStore()

    store.set({ lastSyncedAt: '2026-08-19T10:00:00.000Z' })
    store.set({ phase: 'syncing' })

    expect(store.get().phase).toBe('syncing')
    expect(store.get().lastSyncedAt).toBe('2026-08-19T10:00:00.000Z')
  })

  test('Abonnenten bekommen jeden Zustand', () => {
    const store = createSyncStateStore()
    const seen: SyncPhase[] = []

    store.subscribe(snapshot => seen.push(snapshot.phase))
    store.set({ phase: 'syncing' })
    store.set({ phase: 'idle' })

    expect(seen).toEqual(['syncing', 'idle'])
  })

  test('nach dem Abmelden kommt nichts mehr an', () => {
    const store = createSyncStateStore()
    const seen: SyncPhase[] = []
    const unsubscribe = store.subscribe(snapshot => seen.push(snapshot.phase))

    store.set({ phase: 'syncing' })
    unsubscribe()
    store.set({ phase: 'error' })

    expect(seen).toEqual(['syncing'])
  })

  test('ein Abonnent darf sich im eigenen Aufruf abmelden', () => {
    // Sonst bräche die laufende Schleife über die Abonnenten.
    const store = createSyncStateStore()
    const seen: SyncPhase[] = []

    const unsubscribe = store.subscribe(() => unsubscribe())
    store.subscribe(snapshot => seen.push(snapshot.phase))

    store.set({ phase: 'syncing' })
    store.set({ phase: 'idle' })

    expect(seen).toEqual(['syncing', 'idle'])
  })

  test('zwei Speicher teilen sich nichts', () => {
    const first = createSyncStateStore()
    const second = createSyncStateStore()

    first.set({ phase: 'error' })

    expect(second.get().phase).toBe('idle')
  })
})

describe('toDisplayState', () => {
  test('jede Phase hat eine Entsprechung in der Anzeige', () => {
    const expected: [SyncPhase, string][] = [
      ['idle', 'synced'],
      ['syncing', 'syncing'],
      ['pending', 'pending'],
      ['offline', 'offline'],
      ['error', 'error'],
      // Kein eigenes Symbol vorhanden; "offline" wäre eine Lüge, denn der
      // Nutzer soll sich anmelden statt aufs Netz zu warten.
      ['authRequired', 'error'],
    ]

    for (const [phase, display] of expected) {
      expect(toDisplayState(phase)).toBe(display)
    }
  })
})

describe('phaseFromError', () => {
  test('ein totes Konto verlangt eine Anmeldung', () => {
    expect(phaseFromError(new SyncError('x', { kind: 'auth' }))).toBe('authRequired')
  })

  test('ohne Netz ist es kein Fehler, sondern offline', () => {
    expect(phaseFromError(new SyncError('x', { kind: 'offline' }))).toBe('offline')
  })

  test('alles andere ist ein Fehler', () => {
    for (const kind of ['permanent', 'transient', 'rateLimited'] as const) {
      expect(phaseFromError(new SyncError('x', { kind }))).toBe('error')
    }
  })
})

describe('SyncSnapshot', () => {
  test('der Ausgangszustand meldet nichts Offenes', () => {
    const snapshot: SyncSnapshot = INITIAL_SNAPSHOT

    expect(snapshot.phase).toBe('idle')
    expect(snapshot.pendingCount).toBe(0)
    expect(snapshot.conflict).toBeNull()
    expect(snapshot.message).toBeNull()
  })
})
