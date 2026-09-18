import { describe, expect, test } from 'bun:test'
import { createBffProof } from '../utils/bffProof'

describe('BFF proof protocol', () => {
  test('matches an independently calculated wire fixture including query and IPv6', () => {
    const headers: Record<string, string> = {
      'x-auth-timestamp': '1755000000000',
      'x-auth-body-hash': 'a'.repeat(64),
      'x-shliste-client-ip': '2001:db8::1',
    }
    const url = new URL('https://api.shliste.app/sync/pull?since=a%2Bb&token=two')
    const proof = createBffProof('bff-test-only', 'GET', url, headers)
    expect(proof).toBe('8a0b345b96ab848e823980654206094d00ecd1ea850215e91995d6cdd24fcb23')
    expect(createBffProof('app-test-only', 'GET', url, headers)).not.toBe(proof)
    headers['x-auth-body-hash'] = 'b'.repeat(64)
    expect(createBffProof('bff-test-only', 'GET', url, headers)).not.toBe(proof)
  })
})
