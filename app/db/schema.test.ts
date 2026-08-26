/// <reference types="bun" />
/**
 * Das Nachtragen der Link-Felder beim Sprung auf Datenbankversion 3.
 *
 * DAS FEHLERBILD, gegen das es diesen Schritt gibt: IndexedDB ist schemalos.
 * Eine Zeile, die vor den Link-Feldern entstanden ist, trägt die vier
 * Schlüssel überhaupt nicht. `changedFields` vergleicht mit `Object.is`, und
 * `undefined` gegen `null` ist eine Änderung — der nächste harmlose Schreibzug
 * (ein Häkchen!) würde also einen Zeitstempel auf `url` stempeln, obwohl
 * niemand je einen Link gesetzt hat. Dieser Phantom-Stempel gewinnt dann beim
 * Merge gegen den Server und könnte einen echten Link löschen.
 *
 * Geprüft wird hier die reine Entscheidung, nicht die IndexedDB-Verdrahtung —
 * wie bei allen Nachbartests dieser Schicht.
 */
import { describe, expect, test } from 'bun:test'
import { DB_VERSION, fillLinkFields, needsLinkBackfill, type StoredListItemRow } from './schema'

/**
 * Eine Zeile aus der Zeit vor den Link-Feldern: die vier Schlüssel fehlen
 * schlicht. Genau so liefert IndexedDB sie zurück.
 */
const altzeile: StoredListItemRow = {
  id: 'item-1',
  listId: 'list-1',
  name: 'Milch',
  quantity: 1,
  checked: false,
  removed: false,
  orderIndex: 0,
  sortKey: 'a0',
  createdBy: null,
  modifiedBy: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  deletedAt: null,
  fieldTimestamps: { name: '2026-08-01T10:00:00.000Z' },
  dirty: 0,
}

describe('DB_VERSION', () => {
  test('steht auf 3 — die Link-Felder sind der Grund', () => {
    expect(DB_VERSION).toBe(3)
  })
})

describe('needsLinkBackfill', () => {
  test('eine Zeile ohne die vier Schlüssel braucht den Nachtrag', () => {
    expect(needsLinkBackfill(altzeile)).toBe(true)
  })

  test('eine vollständige Zeile wird nicht angefasst', () => {
    expect(needsLinkBackfill({
      ...altzeile,
      url: null,
      linkTitle: null,
      linkImagePath: null,
      linkImageKind: null,
    })).toBe(false)
  })

  test('ein gesetzter Wert zählt genauso als vorhanden wie null', () => {
    expect(needsLinkBackfill({
      ...altzeile,
      url: 'https://kochwelt.de/x',
      linkTitle: 'Ofenkartoffeln',
      linkImagePath: 'link:0123456789abcdef0123456789abcdef.webp',
      linkImageKind: 'preview',
    })).toBe(false)
  })

  test('ein einziger fehlender Schlüssel genügt — für jeden der vier', () => {
    // Sonst bliebe eine halb migrierte Zeile für immer halb migriert. Der
    // Test geht alle vier durch, damit kein Schlüssel aus der Prüfliste
    // fallen kann, ohne dass es auffällt.
    const vollstaendig = { ...altzeile, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null }
    expect(needsLinkBackfill(vollstaendig)).toBe(false)

    for (const key of ['url', 'linkTitle', 'linkImagePath', 'linkImageKind']) {
      // Ohne `delete` zusammengesetzt: Ein dynamisches `delete` ist in diesem
      // Repo untersagt, und ein Filter über die Einträge sagt ohnehin klarer,
      // was gemeint ist — „alle ausser diesem einen".
      const ohneEinen = Object.fromEntries(
        Object.entries(vollstaendig).filter(([vorhanden]) => vorhanden !== key),
      )
      expect(needsLinkBackfill(ohneEinen)).toBe(true)
    }
  })
})

describe('fillLinkFields', () => {
  test('ergänzt die vier fehlenden Schlüssel mit null', () => {
    const gefuellt = fillLinkFields(altzeile)
    expect(gefuellt.url).toBeNull()
    expect(gefuellt.linkTitle).toBeNull()
    expect(gefuellt.linkImagePath).toBeNull()
    expect(gefuellt.linkImageKind).toBeNull()
    expect(needsLinkBackfill(gefuellt)).toBe(false)
  })

  test('lässt alles andere unberührt — besonders dirty und die Zeitstempel', () => {
    // Der Nachtrag ist KEINE inhaltliche Änderung. Würde er die Zeile
    // schmutzig machen, lüde jedes Gerät nach dem Update seinen gesamten
    // Bestand hoch, und ein verschobenes `updatedAt` kippte reihenweise
    // LWW-Entscheidungen.
    const gefuellt = fillLinkFields(altzeile)
    expect(gefuellt.dirty).toBe(0)
    expect(gefuellt.updatedAt).toBe(altzeile.updatedAt)
    expect(gefuellt.fieldTimestamps).toEqual({ name: '2026-08-01T10:00:00.000Z' })
    expect(gefuellt.name).toBe('Milch')
  })

  test('einen bereits gesetzten Wert überschreibt es nicht', () => {
    const gefuellt = fillLinkFields({
      ...altzeile,
      url: 'https://kochwelt.de/x',
      linkTitle: 'Ofenkartoffeln',
      linkImageKind: 'icon',
    })
    expect(gefuellt.url).toBe('https://kochwelt.de/x')
    expect(gefuellt.linkTitle).toBe('Ofenkartoffeln')
    expect(gefuellt.linkImagePath).toBeNull()
    expect(gefuellt.linkImageKind).toBe('icon')
  })
})
