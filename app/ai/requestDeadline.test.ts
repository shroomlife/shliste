import { describe, expect, test } from 'bun:test'
import { requestDeadline } from './requestDeadline'

describe('AI transport deadline', () => {
  test('bounds a request with a caller signal without AbortSignal.any', async () => {
    const parent = new AbortController()
    const deadline = requestDeadline(10, parent.signal)
    try {
      await new Promise<void>(resolve => deadline.signal.addEventListener('abort', () => resolve(), { once: true }))
      expect(deadline.signal.reason.name).toBe('TimeoutError')
      expect(parent.signal.aborted).toBe(false)
    }
    finally { deadline.dispose() }
  })
  test('preserves an already requested user cancellation', () => {
    const parent = new AbortController()
    parent.abort('user-cancelled')
    const deadline = requestDeadline(1000, parent.signal)
    expect(deadline.signal.aborted).toBe(true)
    expect(deadline.signal.reason).toBe('user-cancelled')
    deadline.dispose()
  })
  test('completed requests detach their caller listener and timer', async () => {
    const parent = new AbortController()
    const deadline = requestDeadline(5, parent.signal)
    deadline.dispose()
    parent.abort()
    await new Promise(resolve => setTimeout(resolve, 15))
    expect(deadline.signal.aborted).toBe(false)
  })
})
