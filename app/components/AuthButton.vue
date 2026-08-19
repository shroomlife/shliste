<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Anmelden und Abmelden — der einzige Ort, an dem Google Identity Services
 * berührt wird.
 *
 * Die App funktioniert ohne Konto vollständig. Dieser Knopf schaltet
 * ausschliesslich Abgleich und Teilen frei; er hält nichts auf und sperrt
 * nichts. Scheitert hier etwas, bleibt die App genau so benutzbar wie vorher.
 *
 * Das Skript von Google wird erst beim Klick nachgeladen und nie auf dem
 * Server: Es taugt dort nicht (es braucht `document`), und eine App, die man
 * ohne Konto benutzt, soll für einen Besuch keine fremde Verbindung öffnen.
 *
 * Das ID-Token wird hier nur entgegengenommen und weitergereicht. Geprüft wird
 * es von api.shliste.app (Signatur, Aussteller, aud) — eine Prüfung im Browser
 * wäre wertlos, weil der Browser die Antwort selbst stellt.
 */

/** Die Teile von `window.google`, die dieser Knopf tatsächlich benutzt. */
interface GoogleCredentialResponse {
  /** Das kodierte ID-Token (JWT), das Google ausstellt. */
  credential: string
}

interface GooglePromptNotification {
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        cancel_on_tap_outside?: boolean
      }) => void
      prompt: (listener?: (notification: GooglePromptNotification) => void) => void
      disableAutoSelect: () => void
    }
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/**
 * Engt das globale `google` ein, statt es zu casten.
 *
 * Der Wert stammt aus einem fremden Skript und ist damit unbewiesen: Ein
 * blindes `as` würde einen Ladefehler oder eine geänderte Fassung der
 * Bibliothek erst beim Aufruf als "is not a function" sichtbar machen.
 */
function isGoogleIdentityApi(value: unknown): value is GoogleIdentityApi {
  if (typeof value !== 'object' || value === null || !('accounts' in value)) return false

  const accounts = value.accounts
  if (typeof accounts !== 'object' || accounts === null || !('id' in accounts)) return false

  const id = accounts.id
  if (typeof id !== 'object' || id === null) return false

  return 'initialize' in id && typeof id.initialize === 'function'
    && 'prompt' in id && typeof id.prompt === 'function'
    && 'disableAutoSelect' in id && typeof id.disableAutoSelect === 'function'
}

/** Die geladene Bibliothek, oder `null` solange sie nicht bereitsteht. */
function readGoogleIdentityApi(): GoogleIdentityApi | null {
  if (import.meta.server) return null

  const candidate: unknown = Reflect.get(globalThis, 'google')
  return isGoogleIdentityApi(candidate) ? candidate : null
}

const { public: publicConfig } = useRuntimeConfig()
const clientId = publicConfig.googleClientId
const hasClientId = clientId.length > 0

/**
 * `compact` laesst die Beschriftung weg. Die Icon-Rail auf dem Desktop ist nur
 * 84 Pixel breit — ein beschrifteter Knopf ragt dort heraus und wird
 * abgeschnitten. Die Bedeutung traegt dann `aria-label` und `title`.
 */
const { compact = false } = defineProps<{ compact?: boolean }>()

const { profile, isSignedIn, signIn, signOut, loadSession } = useAuth()
const toast = useToast()

/**
 * Läuft gerade ein Anmeldeversuch? Getrennt von `isLoading` aus `useAuth`,
 * weil dazu auch die Zeit gehört, in der Googles Dialog offen steht — da läuft
 * noch keine einzige eigene Anfrage.
 */
const isSigningIn = ref(false)

/**
 * Das laufende Laden des Skripts. Liegt im Setup und damit je Komponente vor:
 * Der Knopf existiert genau einmal in der Oberfläche, und `readGoogleIdentityApi`
 * fängt den Fall ab, dass eine andere Stelle die Bibliothek bereits geladen hat.
 */
let scriptLoad: Promise<GoogleIdentityApi> | null = null

const displayName = computed<string>(() => profile.value?.displayName ?? profile.value?.email ?? 'Konto')

/** Ersatz für das Profilbild: der erste Buchstabe des Namens. */
const initials = computed<string>(() => displayName.value.slice(0, 1).toUpperCase())

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: profile.value?.email ?? displayName.value, type: 'label' }],
  [{
    label: 'Abmelden',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      void handleSignOut()
    },
  }],
])

onMounted(() => {
  void loadSession()
})

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  const alreadyLoaded = readGoogleIdentityApi()
  if (alreadyLoaded !== null) return Promise.resolve(alreadyLoaded)
  if (scriptLoad !== null) return scriptLoad

  const pending = new Promise<GoogleIdentityApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true

    script.addEventListener('load', () => {
      const api = readGoogleIdentityApi()
      if (api === null) {
        reject(new Error('Das Anmeldeskript von Google hat sich anders gemeldet als erwartet.'))
        return
      }
      resolve(api)
    })

    script.addEventListener('error', () => {
      reject(new Error('Das Anmeldeskript von Google konnte nicht geladen werden.'))
    })

    document.head.append(script)
  })

  scriptLoad = pending

  // Ein Fehlschlag darf nicht zwischengespeichert bleiben, sonst scheitert der
  // zweite Versuch ohne jeden Ladeversuch — etwa nachdem das Netz zurück ist.
  void pending.catch(() => {
    if (scriptLoad === pending) scriptLoad = null
  })

  return pending
}

async function startSignIn(): Promise<void> {
  if (!hasClientId || isSigningIn.value) return

  isSigningIn.value = true
  try {
    const identity = await loadGoogleIdentity()

    identity.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        void completeSignIn(response)
      },
      // Ein Klick daneben soll den Dialog nicht wegnehmen: Wer den Knopf
      // gedrückt hat, will sich anmelden.
      cancel_on_tap_outside: false,
    })

    identity.accounts.id.prompt((notification) => {
      // Seit der Umstellung auf FedCM meldet der Rückruf keinen Anzeigegrund
      // mehr. Mehr als "es geht gerade nicht weiter" ist daraus nicht
      // abzuleiten, und genau darauf beschränkt sich die Reaktion: den Knopf
      // wieder freigeben, damit er nicht endlos lädt.
      if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
        isSigningIn.value = false
      }
    })
  }
  catch (error) {
    isSigningIn.value = false
    reportFailure('Anmeldung nicht möglich', error)
  }
}

async function completeSignIn(response: GoogleCredentialResponse): Promise<void> {
  try {
    await signIn(response.credential)
  }
  catch (error) {
    reportFailure('Anmeldung fehlgeschlagen', error)
  }
  finally {
    isSigningIn.value = false
  }
}

async function handleSignOut(): Promise<void> {
  try {
    await signOut()

    // Ohne diesen Aufruf meldet Google beim nächsten Öffnen sofort dasselbe
    // Konto wieder an — die Abmeldung wäre für den Nutzer wirkungslos.
    readGoogleIdentityApi()?.accounts.id.disableAutoSelect()
  }
  catch (error) {
    reportFailure('Abmelden fehlgeschlagen', error)
  }
}

/**
 * Fehler sichtbar machen statt still zu schlucken. Die Meldung bleibt
 * allgemein: Was genau schiefging, gehört ins Protokoll und nicht auf den
 * Bildschirm.
 */
function reportFailure(title: string, error: unknown): void {
  console.warn(`[AuthButton] ${title}:`, error)
  toast.add({
    title,
    description: 'Die App bleibt ohne Konto vollständig nutzbar. Abgleich und Teilen sind bis dahin aus.',
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
}
</script>

<template>
  <UDropdownMenu
    v-if="isSignedIn"
    :items="menuItems"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="rounded-full"
      :aria-label="`Konto von ${displayName}`"
    >
      <UAvatar
        :src="profile?.photoUrl ?? undefined"
        :alt="displayName"
        :text="initials"
        size="sm"
      />
    </UButton>
  </UDropdownMenu>

  <UButton
    v-else
    icon="i-lucide-log-in"
    color="neutral"
    variant="subtle"
    :square="compact"
    :aria-label="compact ? 'Anmelden' : undefined"
    class="rounded-xl font-bold"
    :loading="isSigningIn"
    :disabled="!hasClientId"
    :title="hasClientId
      ? 'Mit Google anmelden, um zwischen Geräten abzugleichen'
      : 'Anmelden ist hier nicht eingerichtet (NUXT_PUBLIC_GOOGLE_CLIENT_ID fehlt).'"
    @click="startSignIn"
  >
    <span v-if="!compact">Anmelden</span>
  </UButton>
</template>
