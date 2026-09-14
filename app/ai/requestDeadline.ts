/** Uses the standard AbortController even when AbortSignal.any/timeout are unavailable.
 * https://dom.spec.whatwg.org/#interface-abortcontroller
 */
export function requestDeadline(timeoutMs: number, parent?: AbortSignal) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new Error('Invalid request timeout')
  }
  const controller = new AbortController()
  const forward = () => controller.abort(parent?.reason)
  const timer = setTimeout(() => controller.abort(new DOMException('Request deadline exceeded', 'TimeoutError')), timeoutMs)
  parent?.addEventListener('abort', forward, { once: true })
  if (parent?.aborted) forward()
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      parent?.removeEventListener('abort', forward)
    },
  }
}
