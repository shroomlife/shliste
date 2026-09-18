import { expect, test } from 'bun:test'
import { buildImageForm, postAi, type AiFetch } from './transport'

for (const state of ['running', 'finished', 'unknown']) {
  test(`Transportabbruch liest einmal dieselbe ID, niemals einen zweiten POST: ${state}`, async () => {
    const calls: { path: string, method: string }[] = []
    let requestId = ''
    const fetcher: AiFetch = async (path, options) => {
      calls.push({ path, method: options.method })
      if (options.method === 'POST') {
        requestId = options.headers?.['Idempotency-Key'] ?? ''
        throw new Error('connection reset')
      }
      return { ok: true, status: 200, _data: { requestId, state } }
    }
    const result = await postAi('suggest', {}, undefined, fetcher)
    expect(result.ok).toBe(false)
    expect(calls).toEqual([{ path: '/api/ai/suggest', method: 'POST' },
      { path: `/api/ai/requests/${requestId}`, method: 'GET' }])
    if (!result.ok) expect(result.aborted).toBe(false)
  })
}

test('Gateway 504 wird lesend abgeglichen, Budget 503 bleibt eigener Fehler', async () => {
  let calls = 0
  const fetcher: AiFetch = async () => {
    calls += 1
    return { ok: false, status: 504 }
  }
  expect((await postAi('suggest', {}, undefined, fetcher)).ok).toBe(false)
  expect(calls).toBe(2)
  calls = 0
  const budget: AiFetch = async () => {
    calls += 1
    return { ok: false, status: 503, _data: { code: 'AI_OPERATOR_BUDGET_EXHAUSTED' } }
  }
  expect((await postAi('suggest', {}, undefined, budget)).ok).toBe(false)
  expect(calls).toBe(1)
})

test('ausdruecklicher Abbruch startet keinen Statusverkehr', async () => {
  const controller = new AbortController()
  controller.abort()
  let calls = 0
  const fetcher: AiFetch = async () => {
    calls += 1
    throw new Error('abort')
  }
  expect(await postAi('suggest', {}, controller.signal, fetcher)).toEqual({ ok: false, error: 'Abgebrochen.', aborted: true })
  expect(calls).toBe(1)
})

test('the image form carries every file under the same field, in selection order', () => {
  const first = new File(['a'], 'seite-1.jpg', { type: 'image/jpeg' })
  const second = new File(['b'], 'seite-2.jpg', { type: 'image/jpeg' })
  const third = new File(['c'], 'seite-3.jpg', { type: 'image/jpeg' })

  const form = buildImageForm([first, second, third], '  Doppelseite  ')

  const files = form.getAll('file')
  expect(files.map(entry => entry instanceof File ? entry.name : null)).toEqual(['seite-1.jpg', 'seite-2.jpg', 'seite-3.jpg'])
  expect(form.get('text')).toBe('Doppelseite')

  // Eine leere Beschreibung wird gar nicht erst mitgeschickt.
  expect(buildImageForm([first], '   ').has('text')).toBe(false)
})
