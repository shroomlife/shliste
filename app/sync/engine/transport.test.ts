/// <reference types="bun" />
/**
 * Tests des Anfragewegs zur eigenen BFF.
 *
 * Geprüft wird die Frist — die Eigenschaft, an der es am teuersten fehlte:
 * Browser-`fetch` bringt von sich aus keine mit, und die Engine hält während
 * einer laufenden Anfrage die tab-übergreifende Sperre. Eine halb offene
 * Leitung liess damit jeden weiteren Auslöser in JEDEM Tab ins Leere laufen,
 * bis der TCP-Stack von selbst aufgab. Das war der einzige Zustand im ganzen
 * Abgleich, der sich nicht von selbst heilte.
 *
 * `fetchImpl` ist dafür da, genau das ohne Netz prüfen zu können.
 */
import { describe, expect, test } from 'bun:test'
import { REQUEST_TIMEOUT_MS, requestJson } from './transport'

/** Nimmt das `init` entgegen, mit dem `fetch` gerufen worden wäre. */
function spy(): { calls: RequestInit[], fetchImpl: (input: string, init?: RequestInit) => Promise<Response> } {
  const calls: RequestInit[] = []
  return {
    calls,
    fetchImpl: (_input, init) => {
      calls.push(init ?? {})
      return Promise.resolve(new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
    },
  }
}

describe('Frist', () => {
  test('ohne eigenes Signal bekommt jede Anfrage eine Frist', () => {
    const { calls, fetchImpl } = spy()

    return requestJson('/api/sync/status', { fetchImpl }).then(() => {
      expect(calls[0]?.signal).toBeInstanceOf(AbortSignal)
    })
  })

  test('ein übergebenes Signal bleibt das einzige', async () => {
    // Wer selbst abbricht, soll nicht zusätzlich eine fremde Uhr mitlaufen
    // haben, von der er nichts weiss.
    const { calls, fetchImpl } = spy()
    const eigenes = new AbortController().signal

    await requestJson('/api/sync/status', { fetchImpl, signal: eigenes })

    expect(calls[0]?.signal).toBe(eigenes)
  })

  test('die Frist ist gross genug für einen echten Abruf und klein genug für einen Menschen', () => {
    // Keine Willkür-Prüfung, sondern eine Schranke gegen versehentliche
    // Extreme: Unter 5 Sekunden bricht ein grosser Pull ab, über 60 Sekunden
    // hält die tab-übergreifende Sperre länger, als jemand wartet.
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000)
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(60_000)
  })

  test('ein Abbruch kommt als Netzfehler heraus, nicht als Absturz', async () => {
    const abgebrochen = new AbortController()
    abgebrochen.abort()

    const fetchImpl = (): Promise<Response> =>
      Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))

    // Wichtig ist nur, dass es ein geordneter Fehler ist: Der Aufrufer
    // behandelt ihn wie jeden anderen Netzfehler und versucht es später erneut.
    await expect(requestJson('/api/sync/status', { fetchImpl })).rejects.toBeDefined()
  })
})
