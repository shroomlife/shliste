/// <reference types="bun" />
/**
 * Golden Fixtures für die beiden Link-Regeln, die in allen drei Repos
 * buchstabengleich gelten müssen: der Anzeigename einer Zeile und die Frage,
 * ob eine Eingabe ein Link ist.
 *
 * DIESE Fassung von `link-fixtures.json` ist die Quelle der Wahrheit. Die
 * Gegenstücke lesen wortgleiche Kopien:
 * - `api.shliste.app/src/lib/link-fixtures.json`
 * - `android-app/app/src/test/resources/link-fixtures.json`
 *
 * Aufbau bewusst wie `field-lww.test.ts`: Version und Fallzahlen zuerst,
 * danach ein Test je Fall. Die Datei wird zur Laufzeit geprüft statt dem
 * JSON-Import zu glauben — der hergeleitete Typ ist die Vereinigung aller
 * Fälle und sagt nichts darüber, ob ein einzelner vollständig ist.
 */
import { describe, expect, test } from 'bun:test'
import { detectLinkInput } from '../../utils/linkDetection'
import { listItemDisplayName, showHostLine } from '../../utils/listItemDisplay'
import { hostOf, validHttpUrlOrNull } from '../../utils/url'
import linkFixtures from './link-fixtures.json'

/**
 * Der Vertrag, den alle drei Loader gemeinsam prüfen.
 *
 * Version UND Fallzahlen: Ein Fall, der nur in einem Repo ergänzt wird,
 * driftete sonst still — jeder Loader liest brav, was bei ihm liegt, und
 * meldet grün. Reihenfolge beim Ergänzen: hier in der Quelle eintragen, die
 * Zahlen in allen drei Loadern hochsetzen, beide Kopien neu ziehen.
 */
const EXPECTED_SCHEMA_VERSION = 2
const EXPECTED_DISPLAY_NAME_COUNT = 10
const EXPECTED_DETECT_COUNT = 13
const EXPECTED_VALID_URL_COUNT = 14

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

function readNullableString(source: Record<string, unknown>, key: string, where: string): string | null {
  const value = source[key]
  if (value === null) return null
  if (typeof value !== 'string') throw new Error(`${where}.${key}: String oder null erwartet`)
  return value
}

function readBoolean(source: Record<string, unknown>, key: string, where: string): boolean {
  const value = source[key]
  if (typeof value !== 'boolean') throw new Error(`${where}.${key}: Boolean erwartet`)
  return value
}

function readNumber(source: Record<string, unknown>, key: string, where: string): number {
  const value = source[key]
  if (typeof value !== 'number') throw new Error(`${where}.${key}: Zahl erwartet`)
  return value
}

function readArray(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key]
  if (!Array.isArray(value)) throw new Error(`link-fixtures.json.${key}: Array erwartet`)
  return value
}

interface DisplayNameCase {
  name: string
  input: { name: string, linkTitle: string | null, url: string | null }
  expected: { displayName: string, host: string, showHostLine: boolean }
}

function readDisplayNameCase(value: unknown, index: number): DisplayNameCase {
  const where = `displayName[${index}]`
  if (!isRecord(value)) throw new Error(`${where}: Objekt erwartet`)

  const input = readRecord(value, 'input', where)
  const expected = readRecord(value, 'expected', where)

  return {
    name: readString(value, 'name', where),
    input: {
      name: readString(input, 'name', `${where}.input`),
      linkTitle: readNullableString(input, 'linkTitle', `${where}.input`),
      url: readNullableString(input, 'url', `${where}.input`),
    },
    expected: {
      displayName: readString(expected, 'displayName', `${where}.expected`),
      host: readString(expected, 'host', `${where}.expected`),
      showHostLine: readBoolean(expected, 'showHostLine', `${where}.expected`),
    },
  }
}

/**
 * Ein Fall der Form „eine Zeichenkette rein, eine Zeichenkette oder null
 * raus". Zwei der drei Tabellen haben diese Form: `detectLinkInput` und
 * `validHttpUrl`.
 */
interface InputOutputCase {
  name: string
  input: string
  expected: string | null
}

function readInputOutputCase(table: string) {
  return (value: unknown, index: number): InputOutputCase => {
    const where = `${table}[${index}]`
    if (!isRecord(value)) throw new Error(`${where}: Objekt erwartet`)

    return {
      name: readString(value, 'name', where),
      input: readString(value, 'input', where),
      expected: readNullableString(value, 'expected', where),
    }
  }
}

const raw: unknown = linkFixtures
if (!isRecord(raw)) throw new Error('link-fixtures.json: Objekt erwartet')

const schemaVersion = readNumber(raw, 'schemaVersion', 'link-fixtures.json')
const displayNameCases = readArray(raw, 'displayName').map(readDisplayNameCase)
const detectCases = readArray(raw, 'detectLinkInput').map(readInputOutputCase('detectLinkInput'))
const validUrlCases = readArray(raw, 'validHttpUrl').map(readInputOutputCase('validHttpUrl'))

describe('Link-Fixtures', () => {
  test('die Datei trägt die Vertragsversion, die dieser Loader kennt', () => {
    expect(schemaVersion).toBe(EXPECTED_SCHEMA_VERSION)
  })

  test('alle drei Tabellen haben exakt die erwartete Anzahl Fälle', () => {
    // Exakt und nicht „mindestens": Auch ein ZUSÄTZLICHER Fall ist Drift,
    // solange er nicht in allen drei Repos steht.
    expect(displayNameCases.length).toBe(EXPECTED_DISPLAY_NAME_COUNT)
    expect(detectCases.length).toBe(EXPECTED_DETECT_COUNT)
    expect(validUrlCases.length).toBe(EXPECTED_VALID_URL_COUNT)
  })

  test('jeder Fall hat einen eindeutigen Namen', () => {
    // Über ALLE Tabellen hinweg eindeutig: Ein Fehlschlag nennt nur den Namen,
    // und zwei gleich benannte Fälle in verschiedenen Tabellen schickten die
    // Suche in die falsche Datei.
    const alle = [...displayNameCases, ...detectCases, ...validUrlCases].map(one => one.name)
    expect(new Set(alle).size).toBe(alle.length)
  })

  test('die Datei erklärt jede Regel, die sie prüft', () => {
    const contract = readRecord(raw, 'contract', 'link-fixtures.json')
    for (const key of ['displayName', 'host', 'showHostLine', 'detectLinkInput', 'validHttpUrl']) {
      expect(readString(contract, key, 'link-fixtures.json.contract').length).toBeGreaterThan(40)
    }
  })
})

describe('Link-Fixtures: Anzeigename', () => {
  for (const one of displayNameCases) {
    test(one.name, () => {
      expect(listItemDisplayName(one.input)).toBe(one.expected.displayName)
      expect(hostOf(one.input.url)).toBe(one.expected.host)
      expect(showHostLine(one.input)).toBe(one.expected.showHostLine)
    })
  }
})

describe('Link-Fixtures: Link-Erkennung', () => {
  for (const one of detectCases) {
    test(one.name, () => {
      const detected = detectLinkInput(one.input)
      expect(detected === null ? null : detected.url).toBe(one.expected)
    })
  }
})

/**
 * Die Prüfung, die an JEDER Schreibstelle läuft — und die als einzige der drei
 * Regeln auch auf dem Server existiert (`sanitizeItemUrl`).
 *
 * Sie hat diese Tabelle bekommen, weil die drei Repos hier dreifach
 * auseinandergelaufen waren: Die PWA lehnte Steuerzeichen ab, Android nur den
 * Zeilenumbruch, der Server gar keine — und eine vierte Abweichung (leerer
 * Autoritätsteil) fiel erst beim Nachrechnen auf. Eine davon hätte einen
 * gespeicherten Link beim nächsten Abgleich still gelöscht.
 */
describe('Link-Fixtures: Adressprüfung', () => {
  for (const one of validUrlCases) {
    test(one.name, () => {
      expect(validHttpUrlOrNull(one.input)).toBe(one.expected)
    })
  }
})
