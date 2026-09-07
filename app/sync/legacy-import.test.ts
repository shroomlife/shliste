/**
 * Die Übernahme der alten localStorage-Daten.
 *
 * DIESE ABBILDUNG IST DIE STELLE, AN DER DATEN VERSCHWINDEN KÖNNEN. Sie läuft
 * genau einmal je Gerät und liest Dokumente, die niemand mehr erzeugt — ein
 * Fehler hier fällt erst auf, wenn eine Liste fehlt, und dann ist die Ursache
 * längst vergessen. Deshalb steht jede Regel im Test.
 */
import { describe, expect, test } from 'bun:test'
import {
  isEmptyPlan,
  planLegacyImport,
  toHexColor,
  toItemName,
  toTimestamp,
} from './legacy-import'

const NOW = '2026-08-19T10:00:00.000Z' as const
const COLOR = '#B9D9E9'

function plan(input: { lists?: unknown, recipes?: unknown, markets?: unknown, products?: unknown }) {
  return planLegacyImport({ ...input, fallbackColor: () => COLOR, now: NOW })
}

/* ------------------------------------------------------------------ *
 * Farben
 * ------------------------------------------------------------------ */

describe('toHexColor', () => {
  test('rgba verliert seine Durchsichtigkeit', () => {
    // Die alte Fassung speicherte 20 Prozent Deckkraft mit ab. Heute legt die
    // Oberfläche die Lasur selbst — bliebe der Alpha-Wert stehen, käme sie
    // zweimal und die Karte wäre fast weiß.
    expect(toHexColor('rgba(185, 217, 233, 0.2)', COLOR)).toBe('#B9D9E9')
  })

  test('rgb ohne Alpha geht genauso', () => {
    expect(toHexColor('rgb(0, 128, 255)', COLOR)).toBe('#0080FF')
  })

  test('Hex bleibt Hex, mit und ohne Raute', () => {
    expect(toHexColor('#abcdef', COLOR)).toBe('#ABCDEF')
    expect(toHexColor('abcdef', COLOR)).toBe('#ABCDEF')
  })

  test('Unbrauchbares ergibt die Ersatzfarbe', () => {
    expect(toHexColor('', COLOR)).toBe(COLOR)
    expect(toHexColor(null, COLOR)).toBe(COLOR)
    expect(toHexColor('tomato', COLOR)).toBe(COLOR)
    expect(toHexColor('rgba(300, 0, 0, 1)', COLOR)).toBe(COLOR)
  })
})

/* ------------------------------------------------------------------ *
 * Zeitpunkte
 * ------------------------------------------------------------------ */

describe('toTimestamp', () => {
  test('ein gültiger Zeitstempel bleibt stehen', () => {
    expect(toTimestamp('2025-03-01T12:00:00.000Z', NOW)).toBe('2025-03-01T12:00:00.000Z')
  })

  test('ein Datum ohne Millisekunden wird auf die Form gebracht', () => {
    // Die API prüft per Regex auf genau drei Stellen; ein Verstoß bedeutet
    // 422 auf den ganzen Push.
    expect(toTimestamp('2025-03-01T12:00:00Z', NOW)).toBe('2025-03-01T12:00:00.000Z')
  })

  test('fehlt der Zeitpunkt, gilt der Ersatz', () => {
    // Und nicht etwa die Epoche: Ein erfundener Zeitpunkt weit in der
    // Vergangenheit ließe die Zeile beim Last-Write-Wins immer verlieren.
    expect(toTimestamp(null, NOW)).toBe(NOW)
    expect(toTimestamp('gestern', NOW)).toBe(NOW)
    expect(toTimestamp(undefined, NOW)).toBe(NOW)
  })
})

/* ------------------------------------------------------------------ *
 * Namen
 * ------------------------------------------------------------------ */

describe('toItemName', () => {
  test('die Marke wandert in den Namen', () => {
    // Das heutige Modell kennt kein eigenes Feld dafür, und im Laden ist
    // "Milch Weihenstephan" etwas anderes als "Milch".
    expect(toItemName('Milch', 'Weihenstephan')).toBe('Milch (Weihenstephan)')
  })

  test('ohne Marke bleibt der Name unberührt', () => {
    expect(toItemName('Milch', '')).toBe('Milch')
    expect(toItemName('Milch', undefined)).toBe('Milch')
  })

  test('eine schon im Namen enthaltene Marke wird nicht wiederholt', () => {
    expect(toItemName('Milch Weihenstephan', 'Weihenstephan')).toBe('Milch Weihenstephan')
  })
})

/* ------------------------------------------------------------------ *
 * Der Plan
 * ------------------------------------------------------------------ */

const LEGACY_LIST = {
  uuid: 'l1',
  name: 'Wocheneinkauf',
  description: 'Für die ganze Woche',
  color: 'rgba(185, 217, 233, 0.2)',
  url: 'https://example.com',
  archivedAt: null,
  createdAt: '2025-03-01T12:00:00.000Z',
  updatedAt: '2025-03-02T12:00:00.000Z',
  products: [
    { uuid: 'p1', name: 'Milch', brand: 'Weihenstephan', checked: true },
    { uuid: 'p2', name: 'Brot', checked: false },
  ],
}

const LEGACY_RECIPE = {
  uuid: 'r1',
  name: 'Linsencurry',
  color: '#FFAA00',
  url: '',
  description: 'Schnell gemacht',
  createdAt: '2025-04-01T12:00:00.000Z',
  updatedAt: '2025-04-01T12:00:00.000Z',
  products: [{ uuid: 'i1', name: 'Rote Linsen' }],
  steps: ['Linsen waschen', 'Kokosmilch dazu', ''],
}

describe('planLegacyImport', () => {
  test('übernimmt eine Liste samt Einträgen', () => {
    const result = plan({ lists: [LEGACY_LIST] })

    expect(result.lists).toHaveLength(1)
    expect(result.lists[0]).toMatchObject({
      id: 'l1',
      name: 'Wocheneinkauf',
      color: '#B9D9E9',
      secret: false,
      sourceUrl: 'https://example.com',
      ownerUserId: null,
      createdAt: '2025-03-01T12:00:00.000Z',
      updatedAt: '2025-03-02T12:00:00.000Z',
      deletedAt: null,
    })

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      id: 'p1',
      listId: 'l1',
      name: 'Milch (Weihenstephan)',
      checked: true,
      quantity: 1,
      orderIndex: 0,
    })
    expect(result.items[1]).toMatchObject({ name: 'Brot', checked: false, orderIndex: 1 })
  })

  test('KEINE erfundenen Feld-Zeitstempel', () => {
    // Die alte Fassung kannte sie nicht. Erfundene wären eine Behauptung über
    // die Vergangenheit, mit der die Zeile beim Abgleich Felder gewinnen
    // könnte, die sie nie hatte.
    const result = plan({ lists: [LEGACY_LIST], recipes: [LEGACY_RECIPE] })

    expect(result.lists[0]?.fieldTimestamps).toBeNull()
    expect(result.items[0]?.fieldTimestamps).toBeNull()
    expect(result.recipes[0]?.fieldTimestamps).toBeNull()
    expect(result.steps[0]?.fieldTimestamps).toBeNull()
  })

  test('übernimmt ein Rezept mit Zutaten und Schritten', () => {
    const result = plan({ recipes: [LEGACY_RECIPE] })

    expect(result.recipes[0]).toMatchObject({ id: 'r1', name: 'Linsencurry', color: '#FFAA00', sourceUrl: null })
    expect(result.ingredients).toHaveLength(1)
    expect(result.ingredients[0]).toMatchObject({ recipeId: 'r1', name: 'Rote Linsen', quantity: 1 })

    // Der leere dritte Schritt fällt raus.
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0]).toMatchObject({ recipeId: 'r1', description: 'Linsen waschen', orderIndex: 0, isChecked: false })
    expect(result.steps[1]?.description).toBe('Kokosmilch dazu')
  })

  test('ARCHIVIERTE LISTEN KOMMEN MIT und werden gezählt', () => {
    // Das Archiv als Bereich ist gestrichen, die Listen darin sind trotzdem
    // die Daten des Nutzers. Eine wiederauftauchende Liste ist mit zwei
    // Handgriffen gelöscht, eine verschwundene bekommt niemand zurück.
    const result = plan({
      lists: [LEGACY_LIST, { ...LEGACY_LIST, uuid: 'l2', archivedAt: '2025-05-01T12:00:00.000Z' }],
    })

    expect(result.lists).toHaveLength(2)
    expect(result.archivedLists).toBe(1)
  })

  test('zählt, was nicht übernommen werden kann', () => {
    const result = plan({
      lists: [LEGACY_LIST],
      recipes: [LEGACY_RECIPE],
      markets: [{ uuid: 'm1' }, { uuid: 'm2' }],
      products: [{ uuid: 'k1' }],
    })

    // Je eine Beschreibung an Liste und Rezept — im heutigen Modell gibt es
    // dafür kein Feld.
    expect(result.droppedDescriptions).toBe(2)
    expect(result.droppedCatalogRows).toBe(3)
  })

  test('Zeilen ohne Kennung oder Namen fallen raus', () => {
    const result = plan({
      lists: [
        LEGACY_LIST,
        { uuid: '', name: 'Ohne Kennung' },
        { uuid: 'l3', name: '' },
        'kaputt',
        null,
      ],
    })

    expect(result.lists).toHaveLength(1)
  })

  test('ein Eintrag ohne Kennung nimmt nicht die ganze Liste mit', () => {
    const result = plan({
      lists: [{ ...LEGACY_LIST, products: [{ name: 'Ohne Kennung' }, { uuid: 'p9', name: 'Butter' }] }],
    })

    expect(result.lists).toHaveLength(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Butter')
  })

  test('unbrauchbare Dokumente ergeben einen leeren Plan', () => {
    expect(isEmptyPlan(plan({}))).toBe(true)
    expect(isEmptyPlan(plan({ lists: null, recipes: 'kaputt' }))).toBe(true)
    expect(isEmptyPlan(plan({ lists: [LEGACY_LIST] }))).toBe(false)
  })

  test('die Einträge erben die Zeitpunkte ihrer Liste', () => {
    // Sie hatten in der alten Fassung keine eigenen. Der Zeitpunkt der Liste
    // ist die einzige Angabe, die überhaupt etwas über sie aussagt.
    const result = plan({ lists: [LEGACY_LIST] })

    expect(result.items[0]?.createdAt).toBe('2025-03-01T12:00:00.000Z')
    expect(result.items[0]?.updatedAt).toBe('2025-03-02T12:00:00.000Z')
  })
})
