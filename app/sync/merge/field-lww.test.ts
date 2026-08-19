/**
 * Vertrag des Field-Level-LWW-Merge in Pull-Richtung.
 *
 * Der Kern sind die Golden Fixtures aus `fixtures.json`: dieselbe Fallsammlung
 * soll später auch im API-Repo gegen die dortige Implementierung laufen können,
 * deshalb liegt sie als JSON und nicht als TypeScript vor. Alles darunter sind
 * Invarianten, die sich nicht als Datensatz ausdrücken lassen.
 */
import { describe, expect, test } from 'bun:test'
import type { FieldTimestamps } from '../../../shared/types/domain'
import {
  ADD_WINS_CONTENT_FIELDS,
  ENTITY_TYPES,
  MUTABLE_FIELDS,
  applyAddWins,
  mergeFields,
  mergePulledEntity,
  type EntityType,
} from './field-lww'
import fixtures from './fixtures.json'

interface FixtureRow {
  values: Record<string, unknown>
  fieldTimestamps: FieldTimestamps | null
}

interface FixtureLocalRow extends FixtureRow {
  dirty: boolean
}

interface FixtureExpectation {
  values: Record<string, unknown>
  fieldTimestamps: FieldTimestamps
  dirty: boolean
  restored: boolean
}

interface FixtureCase {
  name: string
  why: string
  entityType: EntityType
  local: FixtureLocalRow | null
  server: FixtureRow
  expected: FixtureExpectation
}

/**
 * Die Fixtures werden zur Laufzeit geprüft statt dem JSON-Import zu glauben.
 *
 * Zwei Gründe: Die Datei ist als Austauschformat zwischen den Repos gedacht und
 * kann dort von Hand erweitert werden, und der Typ, den TypeScript aus einem
 * JSON-Import herleitet, ist die Vereinigung aller Fälle — er sagt nichts
 * darüber, ob ein einzelner Fall vollständig ist. Ein kaputter Fall soll mit
 * einer klaren Meldung scheitern, nicht mit undefined mitten im Vergleich.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(source: Record<string, unknown>, key: string, where: string): Record<string, unknown> {
  const value = source[key]
  if (!isRecord(value)) throw new Error(`${where}.${key}: Objekt erwartet`)
  return value
}

function readString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key]
  if (typeof value !== 'string') throw new Error(`${where}.${key}: String erwartet`)
  return value
}

function readBoolean(source: Record<string, unknown>, key: string, where: string): boolean {
  const value = source[key]
  if (typeof value !== 'boolean') throw new Error(`${where}.${key}: Boolean erwartet`)
  return value
}

function readTimestamps(source: Record<string, unknown>, key: string, where: string): FieldTimestamps {
  const timestamps: FieldTimestamps = {}
  for (const [field, value] of Object.entries(readRecord(source, key, where))) {
    if (typeof value !== 'string') throw new Error(`${where}.${key}.${field}: String erwartet`)
    timestamps[field] = value
  }
  return timestamps
}

function readNullableTimestamps(source: Record<string, unknown>, key: string, where: string): FieldTimestamps | null {
  return source[key] === null ? null : readTimestamps(source, key, where)
}

function readRow(source: Record<string, unknown>, key: string, where: string): FixtureRow {
  const row = readRecord(source, key, where)
  return {
    values: readRecord(row, 'values', `${where}.${key}`),
    fieldTimestamps: readNullableTimestamps(row, 'fieldTimestamps', `${where}.${key}`),
  }
}

function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPES.some(known => known === value)
}

function readCase(value: unknown, index: number): FixtureCase {
  const where = `cases[${index}]`
  if (!isRecord(value)) throw new Error(`${where}: Objekt erwartet`)

  const entityType = readString(value, 'entityType', where)
  if (!isEntityType(entityType)) throw new Error(`${where}.entityType: unbekannter Typ ${entityType}`)

  const expected = readRecord(value, 'expected', where)
  const local = value['local']

  return {
    name: readString(value, 'name', where),
    why: readString(value, 'why', where),
    entityType,
    local: local === null
      ? null
      : { ...readRow(value, 'local', where), dirty: readBoolean(readRecord(value, 'local', where), 'dirty', `${where}.local`) },
    server: readRow(value, 'server', where),
    expected: {
      values: readRecord(expected, 'values', `${where}.expected`),
      fieldTimestamps: readTimestamps(expected, 'fieldTimestamps', `${where}.expected`),
      dirty: readBoolean(expected, 'dirty', `${where}.expected`),
      restored: readBoolean(expected, 'restored', `${where}.expected`),
    },
  }
}

function readFixtures(value: unknown): FixtureCase[] {
  if (!isRecord(value)) throw new Error('fixtures.json: Objekt erwartet')
  const list = value['cases']
  if (!Array.isArray(list)) throw new Error('fixtures.json.cases: Array erwartet')
  return list.map(readCase)
}

const raw: unknown = fixtures
const cases: FixtureCase[] = readFixtures(raw)

describe('Golden Fixtures', () => {
  test('die Sammlung ist nicht versehentlich geschrumpft', () => {
    expect(cases.length).toBeGreaterThan(20)
  })

  test('jeder Fall hat einen eindeutigen Namen', () => {
    expect(new Set(cases.map(one => one.name)).size).toBe(cases.length)
  })

  test('jeder Fall begründet, warum es ihn gibt', () => {
    for (const one of cases) {
      expect(one.why.length).toBeGreaterThan(20)
    }
  })

  for (const one of cases) {
    test(one.name, () => {
      if (!isEntityType(one.entityType)) {
        throw new Error(`Unbekannter entityType in fixtures.json: ${one.entityType}`)
      }

      const result = mergePulledEntity(one.entityType, one.local, one.server)

      expect(result.values).toEqual(one.expected.values)
      expect(result.fieldTimestamps).toEqual(one.expected.fieldTimestamps)
      expect(result.dirty).toBe(one.expected.dirty)
      expect(result.restored).toBe(one.expected.restored)
    })
  }
})

describe('Karten-Invarianten', () => {
  test('beide Karten decken exakt dieselben Entitätstypen ab', () => {
    expect(Object.keys(MUTABLE_FIELDS).sort()).toEqual(Object.keys(ADD_WINS_CONTENT_FIELDS).sort())
  })

  test('die Karten decken exakt die sechs gesyncten Entitätstypen ab', () => {
    expect(Object.keys(MUTABLE_FIELDS).sort()).toEqual([...ENTITY_TYPES].sort())
  })

  test('Positionsfelder und Löschmarker stehen in KEINER Inhaltsliste', () => {
    // Diese Karte spiegeln API und Android buchstabengetreu. Läuft sie
    // auseinander, mergen die Geräte denselben Konflikt verschieden und
    // konvergieren nicht mehr.
    for (const fields of Object.values(ADD_WINS_CONTENT_FIELDS)) {
      expect(fields).not.toContain('orderIndex')
      expect(fields).not.toContain('sortKey')
      expect(fields).not.toContain('deletedAt')
      expect(fields).not.toContain('removed')
    }
  })

  test('jedes Inhaltsfeld nimmt auch am Merge teil', () => {
    // Sonst hätte es nie einen Zeitstempel, an dem Add-Wins sich orientieren könnte.
    for (const [entityType, fields] of Object.entries(ADD_WINS_CONTENT_FIELDS)) {
      const mutable = MUTABLE_FIELDS[entityType] ?? []
      for (const field of fields) {
        expect(mutable).toContain(field)
      }
    }
  })

  test('jeder Typ trägt deletedAt als Löschmarker', () => {
    for (const fields of Object.values(MUTABLE_FIELDS)) {
      expect(fields).toContain('deletedAt')
    }
  })
})

describe('mergeFields', () => {
  test('mutiert die Eingaben nicht', () => {
    const local = { name: 'lokal' }
    const localTs: FieldTimestamps = { name: '2026-07-16T12:00:00.000Z' }
    const server = { name: 'server' }
    const serverTs: FieldTimestamps = { name: '2026-07-16T10:00:00.000Z' }

    mergeFields(['name'], local, localTs, server, serverTs)

    expect(local).toEqual({ name: 'lokal' })
    expect(server).toEqual({ name: 'server' })
    expect(localTs).toEqual({ name: '2026-07-16T12:00:00.000Z' })
    expect(serverTs).toEqual({ name: '2026-07-16T10:00:00.000Z' })
  })

  test('meldet die lokalen Gewinner feldweise', () => {
    const result = mergeFields(
      ['name', 'color'],
      { name: 'lokal', color: '#111111' },
      { name: '2026-07-16T12:00:00.000Z', color: '2026-07-16T08:00:00.000Z' },
      { name: 'server', color: '#222222' },
      { name: '2026-07-16T10:00:00.000Z', color: '2026-07-16T10:00:00.000Z' },
    )

    expect(result.localWinFields).toEqual(['name'])
    expect(result.hasLocalWins).toBe(true)
  })

  test('ohne Felder gibt es nichts zu mergen', () => {
    const result = mergeFields([], { name: 'lokal' }, {}, { name: 'server' }, {})

    expect(result.mergedValues).toEqual({})
    expect(result.hasLocalWins).toBe(false)
  })

  test('ein fehlendes Feld im Gewinner wird als undefined übernommen', () => {
    // Wichtig für den Aufrufer: Der Merge erfindet keine Werte. Fehlt das Feld
    // auf der Gewinnerseite, fehlt es auch im Ergebnis.
    const result = mergeFields(['name'], {}, {}, {}, {})

    expect(result.mergedValues['name']).toBeUndefined()
  })
})

describe('applyAddWins', () => {
  test('ein unbekannter Entitätstyp reanimiert nichts', () => {
    // Sichere Richtung: Ein vergessener Eintrag in der Karte kostet ein
    // Restore, kein stilles Wiederauferstehen gelöschter Daten.
    const values: Record<string, unknown> = { name: 'x', deletedAt: '2026-07-16T10:00:00.000Z' }
    const timestamps: FieldTimestamps = {
      name: '2026-07-16T12:00:00.000Z',
      deletedAt: '2026-07-16T10:00:00.000Z',
    }

    expect(applyAddWins('gibtEsNicht', values, timestamps)).toBe(false)
    expect(values['deletedAt']).toBe('2026-07-16T10:00:00.000Z')
  })

  test('mutiert die übergebenen Werte in-place', () => {
    // Verhalten von API und Android, damit die drei Implementierungen Zeile
    // für Zeile vergleichbar bleiben.
    const values: Record<string, unknown> = { name: 'neu', deletedAt: '2026-07-16T10:00:00.000Z' }
    const timestamps: FieldTimestamps = {
      name: '2026-07-16T11:00:00.000Z',
      deletedAt: '2026-07-16T10:00:00.000Z',
    }

    expect(applyAddWins('listItem', values, timestamps)).toBe(true)
    expect(values['deletedAt']).toBeNull()
    // Der Marker-Zeitstempel bleibt stehen: Ein späteres echtes Delete muss
    // ihn überschreiben können.
    expect(timestamps['deletedAt']).toBe('2026-07-16T10:00:00.000Z')
  })

  test('ohne Löschmarker passiert nichts', () => {
    const values: Record<string, unknown> = { name: 'x', deletedAt: null, removed: false }
    const timestamps: FieldTimestamps = { name: '2026-07-16T10:00:00.000Z' }

    expect(applyAddWins('listItem', values, timestamps)).toBe(false)
    expect(values).toEqual({ name: 'x', deletedAt: null, removed: false })
  })

  test('ein Marker ohne Zeitstempel wird nicht zurückgenommen', () => {
    // Ohne Zeitstempel ist unbekannt, wann gelöscht wurde; "danach bearbeitet"
    // liesse sich nicht belegen. Diese Bedingung entspricht Zeichen für Zeichen
    // der API-Fassung.
    const values: Record<string, unknown> = { name: 'neu', deletedAt: '2026-07-16T10:00:00.000Z' }
    const timestamps: FieldTimestamps = { name: '2026-07-16T11:00:00.000Z' }

    expect(applyAddWins('listItem', values, timestamps)).toBe(false)
    expect(values['deletedAt']).toBe('2026-07-16T10:00:00.000Z')
  })

  test('auch ein leerer Marker-Zeitstempel nimmt nichts zurück', () => {
    // Hier weicht der Android-Client ab: Er prüft nur auf != null, lässt den
    // leeren String durch und stellt die Zeile wieder her. API und Web lassen
    // sie gelöscht. Der Test hält die massgebliche Fassung fest.
    const values: Record<string, unknown> = { name: 'neu', deletedAt: '2026-07-16T10:00:00.000Z' }
    const timestamps: FieldTimestamps = { name: '2026-07-16T11:00:00.000Z', deletedAt: '' }

    expect(applyAddWins('listItem', values, timestamps)).toBe(false)
    expect(values['deletedAt']).toBe('2026-07-16T10:00:00.000Z')
  })

  test('ein unparsbarer Löschmarker verliert gegen einen gültigen Inhalts-Edit', () => {
    const values: Record<string, unknown> = { name: 'neu', deletedAt: '2026-07-16T10:00:00.000Z' }
    const timestamps: FieldTimestamps = { name: '2026-07-16T11:00:00.000Z', deletedAt: 'kaputt' }

    expect(applyAddWins('listItem', values, timestamps)).toBe(true)
    expect(values['deletedAt']).toBeNull()
  })
})

describe('mergePulledEntity', () => {
  test('eine saubere Zeile übernimmt die Serverzeile, ohne sie zu teilen', () => {
    // Kopie statt Referenz: Sonst schriebe eine spätere lokale Änderung in das
    // Objekt zurück, das der Pull noch weiterverwendet.
    const server = { values: { name: 'server' }, fieldTimestamps: { name: '2026-07-16T10:00:00.000Z' } }

    const result = mergePulledEntity('list', null, server)
    result.values['name'] = 'überschrieben'
    result.fieldTimestamps['name'] = 'überschrieben'

    expect(server.values['name']).toBe('server')
    expect(server.fieldTimestamps['name']).toBe('2026-07-16T10:00:00.000Z')
  })
})
