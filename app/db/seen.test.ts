/// <reference types="bun" />
/**
 * Die Rechenregeln des Gesehen-Wasserzeichens aus `seen.ts`.
 *
 * Zwei Zusagen tragen alles: Beide Felder laufen nur vorwärts, und ein
 * Zeitpunkt gilt genau dann als offen, wenn er jünger ist als das, was der
 * Server schon kennt.
 */
import { describe, expect, test } from 'bun:test'
import type { IsoUtc } from '../../shared/types/domain'
import { DIRTY, type ListRow } from './schema'
import { keepListLocalFields, laterIso, pendingSeenMark, withKnownSeen } from './seen'

const EARLY: IsoUtc = '2026-09-01T08:00:00.000Z'
const MIDDLE: IsoUtc = '2026-09-02T08:00:00.000Z'
const LATE: IsoUtc = '2026-09-03T08:00:00.000Z'
const EDITED: IsoUtc = '2026-08-01T08:00:00.000Z'

function list(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: 'l1',
    name: 'Wohnung',
    color: '#123456',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    createdAt: EDITED,
    updatedAt: EDITED,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: DIRTY,
    ...overrides,
  }
}

describe('laterIso', () => {
  test('nimmt den späteren Zeitpunkt, in beiden Reihenfolgen', () => {
    expect(laterIso(EARLY, LATE)).toBe(LATE)
    expect(laterIso(LATE, EARLY)).toBe(LATE)
  })

  test('null ist "keiner" und nicht "ältester"', () => {
    expect(laterIso(null, EARLY)).toBe(EARLY)
    expect(laterIso(EARLY, null)).toBe(EARLY)
    expect(laterIso(null, null)).toBeNull()
  })
})

describe('keepListLocalFields', () => {
  test('übernimmt beide Felder der bestehenden Zeile', () => {
    expect(keepListLocalFields(list({ seenAt: LATE, seenPushedAt: EARLY }))).toEqual({ seenAt: LATE, seenPushedAt: EARLY })
  })

  test('eine Zeile von vor den Feldern und eine neue Zeile ergeben null', () => {
    expect(keepListLocalFields(list())).toEqual({ seenAt: null, seenPushedAt: null })
    expect(keepListLocalFields(undefined)).toEqual({ seenAt: null, seenPushedAt: null })
  })
})

describe('pendingSeenMark', () => {
  test('nie gesehen: nichts zu melden', () => {
    expect(pendingSeenMark(list())).toBeNull()
    expect(pendingSeenMark(list({ seenAt: null, seenPushedAt: EARLY }))).toBeNull()
  })

  test('gesehen und noch nie gemeldet: offen — auch eine Bestandszeile ohne das Feld', () => {
    expect(pendingSeenMark(list({ seenAt: EARLY }))).toEqual({ listId: 'l1', seenAt: EARLY })
    expect(pendingSeenMark(list({ seenAt: EARLY, seenPushedAt: null }))).toEqual({ listId: 'l1', seenAt: EARLY })
  })

  test('jünger als das Gemeldete: offen', () => {
    expect(pendingSeenMark(list({ seenAt: LATE, seenPushedAt: EARLY }))).toEqual({ listId: 'l1', seenAt: LATE })
  })

  test('gleich oder älter als das Gemeldete: erledigt', () => {
    expect(pendingSeenMark(list({ seenAt: LATE, seenPushedAt: LATE }))).toBeNull()
    expect(pendingSeenMark(list({ seenAt: EARLY, seenPushedAt: LATE }))).toBeNull()
  })
})

describe('withKnownSeen', () => {
  test('ein neuerer Serverwert zieht beide Felder nach', () => {
    const next = withKnownSeen(list({ seenAt: EARLY, seenPushedAt: EARLY }), LATE)

    expect(next?.seenAt).toBe(LATE)
    expect(next?.seenPushedAt).toBe(LATE)
    expect(pendingSeenMark(next ?? list())).toBeNull()
  })

  test('ein älterer Serverwert dreht nichts zurück, der lokale bleibt offen', () => {
    const next = withKnownSeen(list({ seenAt: LATE, seenPushedAt: null }), EARLY)

    expect(next?.seenAt).toBe(LATE)
    expect(next?.seenPushedAt).toBe(EARLY)
    expect(pendingSeenMark(next ?? list())).toEqual({ listId: 'l1', seenAt: LATE })
  })

  test('nichts Neues: null, die Zeile wird nicht geschrieben', () => {
    expect(withKnownSeen(list({ seenAt: LATE, seenPushedAt: LATE }), EARLY)).toBeNull()
    expect(withKnownSeen(list({ seenAt: LATE, seenPushedAt: LATE }), LATE)).toBeNull()
  })

  test('Hinschauen ist keine Bearbeitung: dirty, updatedAt und Inhalt bleiben', () => {
    const before = list({ dirty: DIRTY, updatedAt: EDITED, name: 'Wohnung' })
    const next = withKnownSeen(before, LATE)

    expect(next).toEqual({ ...before, seenAt: LATE, seenPushedAt: LATE })
  })

  test('der selbst gemeldete Wert zählt als gemeldet, auch wenn der Server ihn gekappt hat', () => {
    // Geräteuhr geht vor: gemeldet LATE, der Server kappt auf MIDDLE. Ohne
    // den gemeldeten Wert bliebe LATE offen und ginge bei jedem Lauf erneut hinaus.
    const next = withKnownSeen(list({ seenAt: LATE, seenPushedAt: EARLY }), MIDDLE, LATE)

    expect(next?.seenAt).toBe(LATE)
    expect(next?.seenPushedAt).toBe(LATE)
    expect(pendingSeenMark(next ?? list())).toBeNull()
  })

  test('ein seit dem Melden jüngerer Blick bleibt offen', () => {
    // Gemeldet wurde MIDDLE, inzwischen wurde die Liste erneut geöffnet (LATE).
    const next = withKnownSeen(list({ seenAt: LATE, seenPushedAt: EARLY }), MIDDLE, MIDDLE)

    expect(next?.seenAt).toBe(LATE)
    expect(next?.seenPushedAt).toBe(MIDDLE)
    expect(pendingSeenMark(next ?? list())).toEqual({ listId: 'l1', seenAt: LATE })
  })
})
