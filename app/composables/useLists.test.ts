/// <reference types="bun" />
/**
 * Tests der reinen Regeln aus `useLists.ts`.
 *
 * Die Übersicht beantwortet zwei Fragen, die nur sie beantwortet: "ist diese
 * Liste geteilt" und "wie viel davon habe ich noch nicht gesehen". Beide
 * hängen daran, WER gerade angemeldet ist — und genau daran lag der Fehler:
 * Die Sitzung wird beim Start asynchron geholt, die Listen werden sofort
 * gelesen. Wer die Antwort in diesem Moment festschreibt, schreibt fest, dass
 * er seine eigene Identität nicht kennt.
 *
 * Das Gegenstück in der Android-App ist SharedListRuleTest — dort ist
 * derselbe Fehler zuerst aufgetreten und hat dieselbe Regel bekommen.
 */
import { describe, expect, test } from 'bun:test'
import type { ListRow } from '../db/schema'
import { deriveListEntry, isSharedWithOthers, type StoredListEntry } from './useLists'

const ME = 'uuid-ich'
const OTHER = 'uuid-jemand-anderes'

const SEEN_AT = '2026-09-20T10:00:00.000Z'
const BEFORE_SEEN = '2026-09-20T09:00:00.000Z'
const AFTER_SEEN = '2026-09-20T11:00:00.000Z'

function member(userId: string, status: 'accepted' | 'pending' = 'accepted') {
  return { userId, status }
}

function makeList(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: 'liste-1',
    name: 'Wocheneinkauf',
    color: '#AABBCC',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: ME,
    createdAt: BEFORE_SEEN,
    updatedAt: AFTER_SEEN,
    deletedAt: null,
    fieldTimestamps: null,
    dirty: 0,
    seenAt: SEEN_AT,
    ...overrides,
  }
}

function makeStored(overrides: Partial<StoredListEntry> = {}): StoredListEntry {
  return {
    list: makeList(),
    openCount: 1,
    doneCount: 0,
    members: [],
    changes: [],
    ...overrides,
  }
}

describe('isSharedWithOthers', () => {
  test('behauptet ohne bekannte eigene Identität keine Freigabe', () => {
    // Der Kern des Fehlers: Das eigene Konto steht als angenommenes Mitglied
    // in JEDER Liste (die API legt es beim ersten Push als `owner` an).
    // Ohne `ownUserId` wäre `member.userId !== ownUserId` auch für einen
    // selbst wahr — und jede Liste trüge das Geteilt-Symbol.
    expect(isSharedWithOthers([member(ME)], null)).toBe(false)
  })

  test('behauptet ohne eigene Identität auch bei mehreren Mitgliedern nichts', () => {
    // Lieber einen Moment lang kein Symbol als einen Moment lang ein falsches.
    expect(isSharedWithOthers([member(ME), member(OTHER)], null)).toBe(false)
  })

  test('allein in der eigenen Liste ist nicht geteilt', () => {
    expect(isSharedWithOthers([member(ME)], ME)).toBe(false)
  })

  test('eine andere angenommene Person ist geteilt', () => {
    expect(isSharedWithOthers([member(ME), member(OTHER)], ME)).toBe(true)
  })

  test('eine offene Einladung zählt nicht', () => {
    // Wer eingeladen, aber noch nicht bestätigt hat, sieht von der Liste
    // nichts. Ihn mitzuzählen würde eine Freigabe behaupten, die es nicht gibt.
    expect(isSharedWithOthers([member(ME), member(OTHER, 'pending')], ME)).toBe(false)
  })

  test('eine offene Einladung neben einem Mitglied ändert nichts', () => {
    const members = [member(ME), member(OTHER), member('uuid-eingeladen', 'pending')]
    expect(isSharedWithOthers(members, ME)).toBe(true)
  })

  test('eine rein lokale Liste ohne Mitgliederzeilen ist nicht geteilt', () => {
    expect(isSharedWithOthers([], ME)).toBe(false)
    expect(isSharedWithOthers([], null)).toBe(false)
  })
})

describe('deriveListEntry', () => {
  test('zeigt kein Geteilt-Symbol, solange die Sitzung noch unterwegs ist', () => {
    // Der gemeldete Fehler, in einer Zeile: Beim Kaltstart liegt genau dieser
    // Zustand vor — Listen gelesen, Profil noch nicht da.
    const stored = makeStored({ members: [member(ME)] })
    expect(deriveListEntry(stored, null, false).isShared).toBe(false)
  })

  test('antwortet mit derselben Zeile richtig, sobald die Sitzung da ist', () => {
    // DIESELBEN gespeicherten Daten, nur eine andere Identität: Die Antwort
    // muss der Anmeldung folgen und darf nicht beim Lesen der Datenbank
    // eingefroren werden.
    const allein = makeStored({ members: [member(ME)] })
    const geteilt = makeStored({ members: [member(ME), member(OTHER)] })

    expect(deriveListEntry(allein, ME, false).isShared).toBe(false)
    expect(deriveListEntry(geteilt, ME, false).isShared).toBe(true)
  })

  test('zählt ungesehene Fremdänderungen erst mit bekannter Identität', () => {
    const stored = makeStored({
      changes: [{ modifiedBy: OTHER, updatedAt: AFTER_SEEN }],
    })

    // Ohne eigenes Konto gibt es keinen Abgleich und damit keine Fremden.
    expect(deriveListEntry(stored, null, false).unseenCount).toBe(0)
    expect(deriveListEntry(stored, ME, false).unseenCount).toBe(1)
  })

  test('zählt weder eigene Änderungen noch bereits Gesehenes', () => {
    const stored = makeStored({
      changes: [
        { modifiedBy: ME, updatedAt: AFTER_SEEN },
        { modifiedBy: null, updatedAt: AFTER_SEEN },
        { modifiedBy: OTHER, updatedAt: BEFORE_SEEN },
        { modifiedBy: OTHER, updatedAt: AFTER_SEEN },
      ],
    })

    expect(deriveListEntry(stored, ME, false).unseenCount).toBe(1)
  })

  test('zählt in einer nie geöffneten Liste alles Fremde', () => {
    const stored = makeStored({
      list: makeList({ seenAt: null }),
      changes: [
        { modifiedBy: OTHER, updatedAt: BEFORE_SEEN },
        { modifiedBy: OTHER, updatedAt: AFTER_SEEN },
      ],
    })

    expect(deriveListEntry(stored, ME, false).unseenCount).toBe(2)
  })

  test('reicht Liste, Zähler und das Aufleuchten unverändert durch', () => {
    const stored = makeStored({ openCount: 3, doneCount: 2 })
    const entry = deriveListEntry(stored, ME, true)

    expect(entry.list).toBe(stored.list)
    expect(entry.openCount).toBe(3)
    expect(entry.doneCount).toBe(2)
    expect(entry.isRecentlyChanged).toBe(true)
  })
})
