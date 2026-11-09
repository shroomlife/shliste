/**
 * Entsperren geheimer Listen per Platform-Authenticator (WebAuthn) —
 * Gegenstück zu Android-Biometrie. Ohne Hardware-Key bleibt die Liste zu.
 */

const unlockedIds = ref(new Set<string>())

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

const CREDENTIAL_KEY = 'shliste.webauthn.secret'

export function useSecretUnlock() {
  const isSupported = computed(() =>
    import.meta.client
      && typeof window !== 'undefined'
      && !!window.PublicKeyCredential
      && typeof navigator.credentials?.create === 'function',
  )

  function isUnlocked(listId: string): boolean {
    return unlockedIds.value.has(listId)
  }

  async function ensureCredential(): Promise<string | null> {
    if (!import.meta.client) return null
    const existing = localStorage.getItem(CREDENTIAL_KEY)
    if (existing) return existing

    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'shliste', id: window.location.hostname },
        user: {
          id: userId,
          name: 'shliste-secret',
          displayName: 'shliste Geheimlisten',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null

    if (!credential) return null
    const id = bufferToBase64Url(credential.rawId)
    localStorage.setItem(CREDENTIAL_KEY, id)
    return id
  }

  async function unlock(listId: string): Promise<boolean> {
    if (!isSupported.value) return false
    try {
      const credentialId = await ensureCredential()
      if (!credentialId) return false

      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            type: 'public-key',
            id: base64UrlToBuffer(credentialId),
          }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })
      if (!assertion) return false

      const next = new Set(unlockedIds.value)
      next.add(listId)
      unlockedIds.value = next
      return true
    }
    catch {
      return false
    }
  }

  function lockAll() {
    unlockedIds.value = new Set()
  }

  return { isSupported, isUnlocked, unlock, lockAll }
}
