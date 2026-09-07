/// <reference types="bun" />
/**
 * Tests der reinen Hilfsfunktionen aus `repositories.ts`.
 *
 * Getestet wird alles, was ohne IndexedDB auskommt: das Ermitteln geänderter
 * Felder, das Fortschreiben der Feld-Zeitstempel und die Sortierungen. Genau
 * diese Logik entscheidet später, wer beim Last-Write-Wins gewinnt.
 */
import { describe, expect, test } from 'bun:test'
import type { List } from '../../shared/types/domain'
import {
  buildRowMeta,
  changedFields,
  compareByCreatedAtAsc,
  compareByManualOrder,
  compareByUpdatedAtDesc,
  type Draft,
  linkFieldsAfterWrite,
  type ManualOrder,
  mergeFieldTimestamps,
  snapshotStampOf,
} from './repositories'
import type { ListRow } from './schema'

const EARLIER = '2026-08-19T10:00:00.000Z'
const NOW = '2026-08-19T10:15:00.000Z'

const draft: Draft<List> = {
  id: 'list-1',
  name: 'Wocheneinkauf',
  color: '#AABBCC',
  secret: false,
  lastSuggestedItems: '',
  sourceUrl: null,
  ownerUserId: null,
  deletedAt: null,
}

/** Die gespeicherte Fassung desselben Entwurfs, wahlweise abgewandelt. */
function storedRow(overrides: Partial<ListRow> = {}): ListRow {
  return {
    ...draft,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    fieldTimestamps: { name: EARLIER },
    dirty: 0,
    ...overrides,
  }
}

describe('changedFields', () => {
  test('meldet bei einer neuen Zeile alle Felder', () => {
    expect(changedFields(undefined, draft).sort()).toEqual([
      'color',
      'deletedAt',
      'lastSuggestedItems',
      'name',
      'ownerUserId',
      'secret',
      'sourceUrl',
    ])
  })

  test('lässt die ID immer außen vor', () => {
    // Die ID ist unveränderlich; ein Zeitstempel darauf hätte keine Bedeutung.
    expect(changedFields(undefined, draft)).not.toContain('id')
    expect(changedFields(storedRow({ id: 'other-id' }), draft)).toEqual([])
  })

  test('meldet nichts, wenn sich nichts geändert hat', () => {
    expect(changedFields(storedRow(), draft)).toEqual([])
  })

  test('meldet genau das geänderte Feld', () => {
    expect(changedFields(storedRow({ name: 'Alter Name' }), draft)).toEqual(['name'])
  })

  test('unterscheidet null von einer leeren Zeichenkette', () => {
    expect(changedFields(storedRow({ sourceUrl: '' }), draft)).toEqual(['sourceUrl'])
  })

  test('erkennt das weiche Löschen als Änderung', () => {
    const deleted: Draft<List> = { ...draft, deletedAt: NOW }
    expect(changedFields(storedRow(), deleted)).toEqual(['deletedAt'])
  })

  test('ignoriert die selbst geführten Felder der gespeicherten Zeile', () => {
    // `updatedAt`, `dirty` und Co. stehen nicht im Entwurf und dürfen deshalb
    // auch nie als Änderung auftauchen.
    expect(changedFields(storedRow({ updatedAt: NOW, dirty: 1 }), draft)).toEqual([])
  })
})

describe('mergeFieldTimestamps', () => {
  test('stempelt bei fehlendem Vorgänger nur die genannten Felder', () => {
    expect(mergeFieldTimestamps(null, ['name', 'color'], NOW)).toEqual({
      name: NOW,
      color: NOW,
    })
  })

  test('lässt die Stempel unveränderter Felder stehen', () => {
    expect(mergeFieldTimestamps({ name: EARLIER, color: EARLIER }, ['color'], NOW)).toEqual({
      name: EARLIER,
      color: NOW,
    })
  })

  test('verändert die übergebene Zuordnung nicht', () => {
    const previous = { name: EARLIER }
    mergeFieldTimestamps(previous, ['name'], NOW)
    expect(previous).toEqual({ name: EARLIER })
  })
})

describe('buildRowMeta', () => {
  test('setzt bei einer neuen Zeile createdAt und updatedAt auf jetzt', () => {
    const meta = buildRowMeta(undefined, ['name'], NOW)
    expect(meta.createdAt).toBe(NOW)
    expect(meta.updatedAt).toBe(NOW)
    expect(meta.fieldTimestamps).toEqual({ name: NOW })
  })

  test('behält createdAt der bestehenden Zeile', () => {
    // createdAt beschreibt die Entstehung, nicht den letzten Schreibvorgang.
    expect(buildRowMeta(storedRow(), ['name'], NOW).createdAt).toBe(EARLIER)
  })

  test('markiert jede Schreiboperation als zu pushen', () => {
    expect(buildRowMeta(storedRow(), ['name'], NOW).dirty).toBe(1)
  })

  test('schreibt nur die geänderten Feldstempel fort', () => {
    const stored = storedRow({ fieldTimestamps: { name: EARLIER, color: EARLIER } })
    expect(buildRowMeta(stored, ['color'], NOW).fieldTimestamps).toEqual({
      name: EARLIER,
      color: NOW,
    })
  })
})

describe('snapshotStampOf', () => {
  test('nimmt updatedAt, wenn die Zeile eines hat', () => {
    expect(snapshotStampOf({ createdAt: EARLIER, updatedAt: NOW })).toBe(NOW)
  })

  test('fällt bei append-only-Zeilen auf createdAt zurück', () => {
    // Chat-Nachrichten haben kein updatedAt.
    expect(snapshotStampOf({ createdAt: EARLIER })).toBe(EARLIER)
  })
})

describe('compareByUpdatedAtDesc', () => {
  test('sortiert die zuletzt geänderte Zeile nach vorn', () => {
    const rows = [{ updatedAt: EARLIER }, { updatedAt: NOW }]
    expect([...rows].sort(compareByUpdatedAtDesc)).toEqual([{ updatedAt: NOW }, { updatedAt: EARLIER }])
  })
})

describe('compareByCreatedAtAsc', () => {
  test('sortiert die älteste Zeile nach vorn', () => {
    const rows = [{ createdAt: NOW }, { createdAt: EARLIER }]
    expect([...rows].sort(compareByCreatedAtAsc)).toEqual([{ createdAt: EARLIER }, { createdAt: NOW }])
  })
})

describe('compareByManualOrder', () => {
  function orderedRow(overrides: Partial<ManualOrder> = {}): ManualOrder {
    return { sortKey: null, orderIndex: 0, createdAt: EARLIER, ...overrides }
  }

  test('richtet sich zuerst nach dem Sortierschlüssel', () => {
    const first = orderedRow({ sortKey: 'a0', orderIndex: 9 })
    const second = orderedRow({ sortKey: 'b0', orderIndex: 1 })
    expect(compareByManualOrder(first, second)).toBe(-1)
    expect(compareByManualOrder(second, first)).toBe(1)
  })

  test('vergleicht Sortierschlüssel nach Zeichenordnung, nicht nach Sprachregeln', () => {
    // Base-62-Bruchindizes: 'Z' steht vor 'a'. localeCompare würde in vielen
    // Sprachen genau andersherum entscheiden und die Reihenfolge zerstören.
    expect(compareByManualOrder(orderedRow({ sortKey: 'Z' }), orderedRow({ sortKey: 'a' }))).toBe(-1)
  })

  test('stellt Zeilen ohne Sortierschlüssel nach hinten', () => {
    const withKey = orderedRow({ sortKey: 'a0' })
    const withoutKey = orderedRow({ sortKey: null })
    expect(compareByManualOrder(withKey, withoutKey)).toBe(-1)
    expect(compareByManualOrder(withoutKey, withKey)).toBe(1)
  })

  test('nutzt orderIndex, wenn kein Sortierschlüssel entscheidet', () => {
    expect(compareByManualOrder(orderedRow({ orderIndex: 2 }), orderedRow({ orderIndex: 5 }))).toBeLessThan(0)
    expect(compareByManualOrder(
      orderedRow({ sortKey: 'a0', orderIndex: 5 }),
      orderedRow({ sortKey: 'a0', orderIndex: 2 }),
    )).toBeGreaterThan(0)
  })

  test('entscheidet bei völligem Gleichstand nach createdAt', () => {
    expect(compareByManualOrder(
      orderedRow({ createdAt: NOW }),
      orderedRow({ createdAt: EARLIER }),
    )).toBe(1)
  })

  test('sortiert eine gemischte Liste vollständig', () => {
    const rows = [
      orderedRow({ sortKey: null, orderIndex: 1, createdAt: NOW }),
      orderedRow({ sortKey: 'b0', orderIndex: 7 }),
      orderedRow({ sortKey: null, orderIndex: 0, createdAt: EARLIER }),
      orderedRow({ sortKey: 'a0', orderIndex: 8 }),
    ]

    expect([...rows].sort(compareByManualOrder).map(row => [row.sortKey, row.orderIndex])).toEqual([
      ['a0', 8],
      ['b0', 7],
      [null, 0],
      [null, 1],
    ])
  })
})

/* ------------------------------------------------------------------ *
 * Die Server-Spiegel eines Link-Eintrags
 * ------------------------------------------------------------------ */

/** Eine gespeicherte Zeile mit Titel und Bild zu ihrer Adresse. */
const angereichert = {
  url: 'https://kochwelt.de/rezept',
  linkTitle: 'Ofenkartoffeln mit Kräuterquark',
  linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
  linkImageKind: 'preview' as const,
}

describe('linkFieldsAfterWrite', () => {
  test('bleibt die Adresse gleich, bleiben Titel und Bild stehen', () => {
    // Ein Häkchen oder eine neue Menge darf die Vorschau nicht wegräumen.
    expect(linkFieldsAfterWrite(angereichert, angereichert.url)).toEqual({
      linkTitle: 'Ofenkartoffeln mit Kräuterquark',
      linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
      linkImageKind: 'preview',
    })
  })

  test('eine andere Adresse räumt alle drei sofort weg', () => {
    // Sonst stünde der Titel der alten Seite unter der neuen Adresse, bis der
    // Server nachzieht — offline beliebig lange.
    expect(linkFieldsAfterWrite(angereichert, 'https://rewe.de/angebote')).toEqual({
      linkTitle: null,
      linkImagePath: null,
      linkImageKind: null,
    })
  })

  test('auch das Entfernen der Adresse räumt sie weg', () => {
    expect(linkFieldsAfterWrite(angereichert, null)).toEqual({
      linkTitle: null,
      linkImagePath: null,
      linkImageKind: null,
    })
  })

  test('eine neue Zeile hat nichts zu behalten', () => {
    expect(linkFieldsAfterWrite(undefined, 'https://kochwelt.de/rezept')).toEqual({
      linkTitle: null,
      linkImagePath: null,
      linkImageKind: null,
    })
  })

  test('eine Zeile ohne Adresse behält ihre leeren Spiegel', () => {
    const ohneLink = { url: null, linkTitle: null, linkImagePath: null, linkImageKind: null }
    expect(linkFieldsAfterWrite(ohneLink, null)).toEqual({
      linkTitle: null,
      linkImagePath: null,
      linkImageKind: null,
    })
  })
})
