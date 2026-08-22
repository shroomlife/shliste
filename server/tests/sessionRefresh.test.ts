/**
 * Tests der reinen Bausteine des stillen Session-Refresh.
 *
 * Geprüft wird nur, was ohne Nitro-Kontext läuft: das exp-Parsing (die
 * Heuristik, WANN refresht wird) und die Single-Flight (die Garantie, dass
 * gleichzeitige Anfragen sich EINEN Refresh teilen — ein Doppel-Refresh
 * widerrufe drüben die ganze Session-Familie). Der Netz-Teil selbst
 * (exchangeRefreshToken) hängt an apiFetch/runtimeConfig und gehört in einen
 * Integrationstest, nicht hierher.
 *
 * Ausführen: `bun test server/tests`
 */
import { describe, expect, test } from 'bun:test'
import { readJwtExpiry, runSingleFlight } from '../utils/sessionRefresh'

/** Baut ein strukturell gültiges (unsigniertes) JWT um die gegebene Payload. */
function tokenWithPayload(payload: unknown): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.unsignierte-attrappe`
}

describe('readJwtExpiry', () => {
  test('liest exp aus einer gültigen Payload', () => {
    expect(readJwtExpiry(tokenWithPayload({ exp: 1_700_000_000, sub: '42' }))).toBe(1_700_000_000)
  })

  test('null, wenn exp fehlt', () => {
    expect(readJwtExpiry(tokenWithPayload({ sub: '42' }))).toBeNull()
  })

  test('null, wenn exp keine endliche Zahl ist', () => {
    expect(readJwtExpiry(tokenWithPayload({ exp: 'bald' }))).toBeNull()
    expect(readJwtExpiry(tokenWithPayload({ exp: Number.POSITIVE_INFINITY }))).toBeNull()
  })

  test('null, wenn die Payload kein Objekt ist', () => {
    expect(readJwtExpiry(tokenWithPayload(['exp', 123]))).toBeNull()
    expect(readJwtExpiry(tokenWithPayload(null))).toBeNull()
  })

  test('null bei kaputter Struktur statt einer Exception', () => {
    expect(readJwtExpiry('')).toBeNull()
    expect(readJwtExpiry('nur-ein-teil')).toBeNull()
    expect(readJwtExpiry('zwei.teile')).toBeNull()
    expect(readJwtExpiry('a.b.c.d')).toBeNull()
    expect(readJwtExpiry('kopf..signatur')).toBeNull()
    expect(readJwtExpiry('kopf.%%%nicht-base64%%%.signatur')).toBeNull()
  })

  test('96-Hex-Refresh-Tokens (kein JWT) ergeben null', () => {
    expect(readJwtExpiry('ab'.repeat(48))).toBeNull()
  })
})

describe('runSingleFlight', () => {
  test('gleichzeitige Aufrufe mit demselben Schlüssel teilen sich EINE Ausführung', async () => {
    const inflight = new Map<string, Promise<string>>()
    let executions = 0
    let release: (value: string) => void = () => {}
    const gate = new Promise<string>((resolve) => {
      release = resolve
    })

    const task = (): Promise<string> => {
      executions += 1
      return gate
    }

    const first = runSingleFlight(inflight, 'key', task)
    const second = runSingleFlight(inflight, 'key', task)
    const third = runSingleFlight(inflight, 'key', task)

    release('token-1')

    expect(await Promise.all([first, second, third])).toEqual(['token-1', 'token-1', 'token-1'])
    expect(executions).toBe(1)
  })

  test('verschiedene Schlüssel laufen unabhängig', async () => {
    const inflight = new Map<string, Promise<string>>()
    let executions = 0
    const task = (result: string) => (): Promise<string> => {
      executions += 1
      return Promise.resolve(result)
    }

    const [a, b] = await Promise.all([
      runSingleFlight(inflight, 'a', task('erste')),
      runSingleFlight(inflight, 'b', task('zweite')),
    ])

    expect(a).toBe('erste')
    expect(b).toBe('zweite')
    expect(executions).toBe(2)
  })

  test('nach dem Abschluss ist der Eintrag geräumt und ein neuer Aufruf startet neu', async () => {
    const inflight = new Map<string, Promise<number>>()
    let executions = 0
    const task = (): Promise<number> => {
      executions += 1
      return Promise.resolve(executions)
    }

    expect(await runSingleFlight(inflight, 'key', task)).toBe(1)
    expect(inflight.size).toBe(0)
    expect(await runSingleFlight(inflight, 'key', task)).toBe(2)
    expect(executions).toBe(2)
  })

  test('eine Ablehnung erreicht alle Wartenden und räumt den Eintrag trotzdem', async () => {
    const inflight = new Map<string, Promise<never>>()
    const boom = new Error('kaputt')
    const task = (): Promise<never> => Promise.reject(boom)

    const first = runSingleFlight(inflight, 'key', task)
    const second = runSingleFlight(inflight, 'key', task)

    await expect(first).rejects.toBe(boom)
    await expect(second).rejects.toBe(boom)
    await first.catch(() => {})
    expect(inflight.size).toBe(0)
  })
})
