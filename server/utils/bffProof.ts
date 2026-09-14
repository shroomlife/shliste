import { createHmac } from 'node:crypto'

/** Separate server credential; never fall back to the distributed app key. */
export function createBffProof(secret: string, method: string, url: URL, headers: Record<string, string>): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(['shliste-bff-v2', method.toUpperCase(), url.pathname, url.search,
      headers['x-auth-timestamp'] ?? null, headers['x-auth-body-hash'] ?? null,
      headers['x-shliste-client-ip'] ?? '']))
    .digest('hex')
}

export function attachBffProof(method: string, url: URL, headers: Record<string, string>): void {
  const { bffSecret } = useRuntimeConfig()
  if (bffSecret) headers['x-bff-signature'] = createBffProof(bffSecret, method, url, headers)
}
