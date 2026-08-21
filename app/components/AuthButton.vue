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
 * ohne Konto benutzt, soll für einen blossen Besuch keine fremde Verbindung
 * öffnen.
 *
 * WARUM EIN DIALOG UND NICHT DER KNOPF DIREKT — der wichtigste Punkt hier:
 * Google kennt zwei Wege zum ID-Token. `prompt()` ist One Tap, das beiläufige
 * Fenster oben rechts. Google dokumentiert ausdrücklich, dass es NICHT
 * verlässlich erscheint: Wer es dreimal wegklickt, sieht es eine Woche lang
 * nicht mehr (danach vier Wochen), und wer "Anmeldung bei Drittanbietern" im
 * Browser abschaltet, sieht es nie. Ein Anmeldeknopf, der daran hängt, tut bei
 * genau diesen Leuten scheinbar nichts — der klassische Fehler, den hinterher
 * niemand nachstellen kann.
 *
 * Der dokumentierte Weg für eine ausdrückliche Anmeldung ist `renderButton()`,
 * Googles eigener Knopf. Der erscheint immer, muss aber gezeichnet werden und
 * braucht dafür Platz: Die Icon-Rail ist 84 Pixel breit, die Kopfzeile auf dem
 * Handy kaum mehr. Deshalb öffnet unser Knopf einen Dialog, und darin steht
 * Googles Knopf in voller Grösse.
 *
 * One Tap fehlt damit bewusst. Sein einziger Vorteil ist das ungefragte
 * Erscheinen beim Seitenaufruf — und genau das wollen wir nicht, siehe oben.
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

/**
 * Die Optionen von `renderButton`, beschränkt auf das, was hier gesetzt wird.
 * Die Breite ist laut Google auf 400 Pixel gedeckelt.
 */
interface GoogleButtonOptions {
  type: 'standard' | 'icon'
  theme: 'outline' | 'filled_blue' | 'filled_black'
  size: 'small' | 'medium' | 'large'
  text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment: 'left' | 'center'
  width: number
  locale: string
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        use_fedcm_for_button: boolean
      }) => void
      renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
      disableAutoSelect: () => void
    }
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/** Grenzen, die Google für die Knopfbreite vorgibt beziehungsweise verträgt. */
const BUTTON_MIN_WIDTH = 200
const BUTTON_MAX_WIDTH = 400

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
    && 'renderButton' in id && typeof id.renderButton === 'function'
    && 'disableAutoSelect' in id && typeof id.disableAutoSelect === 'function'
}

/** Die geladene Bibliothek, oder `null` solange sie nicht bereitsteht. */
function readGoogleIdentityApi(): GoogleIdentityApi | null {
  if (import.meta.server) return null

  const candidate: unknown = Reflect.get(globalThis, 'google')
  return isGoogleIdentityApi(candidate) ? candidate : null
}

/**
 * `compact` lässt die Beschriftung weg. Die Icon-Rail auf dem Desktop ist nur
 * 84 Pixel breit — ein beschrifteter Knopf ragt dort heraus und wird
 * abgeschnitten. Die Bedeutung trägt dann `aria-label` und `title`.
 */
const { compact = false } = defineProps<{ compact?: boolean }>()

const { profile, clientConfig, isSignedIn, signIn, signOut } = useAuth()
const toast = useToast()

// NICHT aus `runtimeConfig.public`: Der App-Bereich wird vorgerendert, und
// dabei wird die öffentliche Konfiguration zur Bauzeit eingebacken — im
// Docker-Build, wo keine Umgebungsvariablen stehen. Genau daran ist der Knopf
// in Produktion hängen geblieben. Der Wert kommt jetzt vom Server (siehe
// server/api/auth/me.get.ts).
const clientId = computed(() => clientConfig.value.googleClientId)
const hasClientId = computed(() => clientId.value.length > 0)

/** Der Anmeldedialog mit Googles Knopf darin. */
const isDialogOpen = ref(false)

/** Läuft gerade der Tausch des ID-Tokens gegen eine Sitzung? */
const isExchanging = ref(false)

/**
 * Wohin Google seinen Knopf zeichnet.
 *
 * Existiert erst, wenn der Dialog offen ist: Sowohl `UModal` als auch
 * `UDrawer` hängen ihren Inhalt beim Öffnen in den DOM.
 */
const buttonHost = useTemplateRef<HTMLElement>('buttonHost')

/** Konnte der Knopf nicht gezeichnet werden, steht hier der Grund für den Nutzer. */
const renderError = ref<string | null>(null)

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
    label: 'Mein Profil',
    icon: 'i-lucide-user',
    to: '/app/profile',
  }],
  [{
    label: 'Abmelden',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      void handleSignOut()
    },
  }],
])

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

/**
 * Googles Knopf verlangt eine Breite in Pixeln, keine Prozentangabe.
 *
 * Sie wird deshalb am tatsächlich vorhandenen Platz gemessen und in Googles
 * Grenzen gehalten. Stünde hier eine feste Zahl, liefe sie auf einem schmalen
 * Handy über den Rand.
 */
function measureButtonWidth(host: HTMLElement): number {
  const available = Math.round(host.getBoundingClientRect().width)
  if (available <= 0) return BUTTON_MIN_WIDTH
  return Math.min(BUTTON_MAX_WIDTH, Math.max(BUTTON_MIN_WIDTH, available))
}

/**
 * Zeichnet Googles Knopf in den geöffneten Dialog.
 *
 * Ausgelöst über einen Watcher auf das Ziel-Element und nicht direkt im Klick:
 * Im Moment des Klicks existiert das Element noch gar nicht.
 */
async function renderGoogleButton(host: HTMLElement): Promise<void> {
  renderError.value = null

  try {
    const identity = await loadGoogleIdentity()

    identity.accounts.id.initialize({
      client_id: clientId.value,
      callback: (response) => {
        void completeSignIn(response)
      },
      /*
       * FedCM ist der Weg, auf den Google alle Anmeldungen umstellt: Nicht
       * mehr Google zeigt das Fenster, sondern der Browser selbst — ohne
       * Drittanbieter-Cookies. Chrome hat die Umstellung im April 2024
       * begonnen und schaltet sie am Ende verbindlich.
       *
       * Wir stellen freiwillig vorher um, statt das Datum abzuwarten. Zwei
       * Gründe: Wer wiederkommt, sieht seinen Namen auch dann noch auf dem
       * Knopf, wenn der Browser Drittanbieter-Cookies blockiert (ohne FedCM
       * fällt genau das weg), und die einmalige Neubestätigung, die FedCM je
       * Browser verlangt, verteilt sich so über Monate statt alle an einem Tag
       * zu treffen.
       */
      use_fedcm_for_button: true,
    })

    // Beim erneuten Öffnen stünden sonst zwei Knöpfe übereinander.
    host.replaceChildren()

    identity.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: measureButtonWidth(host),
      // Fest auf Deutsch: Ohne Angabe richtet sich Google nach dem Konto des
      // Besuchers, und der Knopf bekäme je nach Sprache eine andere Breite.
      locale: 'de',
    })
  }
  catch (error) {
    console.warn('[AuthButton] Googles Anmeldeknopf konnte nicht gezeichnet werden:', error)
    renderError.value = 'Der Anmeldeknopf von Google liess sich nicht laden. Prüfe die Verbindung und versuche es noch einmal.'
  }
}

watch(buttonHost, (host) => {
  if (host === null || host === undefined) return
  void renderGoogleButton(host)
})

async function completeSignIn(response: GoogleCredentialResponse): Promise<void> {
  isExchanging.value = true
  try {
    await signIn(response.credential)
    isDialogOpen.value = false
  }
  catch (error) {
    reportFailure('Anmeldung fehlgeschlagen', error)
  }
  finally {
    isExchanging.value = false
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
      <!-- Ohne Profilbild trägt der Kreis die Initialen. Er bekommt dafür die
           Markenfarbe: Der Standardton von Nuxt UI ist fast weiss und wäre auf
           der hellrosa Rail praktisch unsichtbar. -->
      <UAvatar
        :src="profile?.photoUrl ?? undefined"
        :alt="displayName"
        :text="initials"
        size="sm"
        :ui="{ fallback: 'font-bold' }"
        style="background: var(--md-primary-container); color: var(--md-on-primary-container)"
      />
    </UButton>
  </UDropdownMenu>

  <template v-else>
    <UButton
      icon="i-lucide-log-in"
      color="neutral"
      variant="subtle"
      :square="compact"
      :aria-label="compact ? 'Anmelden' : undefined"
      class="rounded-xl font-bold"
      :disabled="!hasClientId"
      :title="hasClientId
        ? 'Mit Google anmelden, um zwischen Geräten abzugleichen'
        : 'Anmelden ist auf diesem Server nicht eingerichtet.'"
      @click="isDialogOpen = true"
    >
      <span v-if="!compact">Anmelden</span>
    </UButton>

    <AppSheet
      v-model:open="isDialogOpen"
      title="Anmelden"
      description="Mit einem Google-Konto gleichst du deine Listen zwischen Geräten ab und kannst sie teilen."
    >
      <div class="flex flex-col items-center gap-4 py-2">
        <!-- Googles eigener Knopf wird hier hineingezeichnet. Der Rahmen bleibt
             absichtlich leer: Was darin steht, bestimmt Google. -->
        <div
          ref="buttonHost"
          class="flex w-full max-w-100 justify-center"
        />

        <p
          v-if="isExchanging"
          class="text-center text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Einen Moment, die Sitzung wird eingerichtet …
        </p>

        <UAlert
          v-else-if="renderError !== null"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :description="renderError"
        />

        <p
          class="text-center text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Ohne Konto bleibt die App vollständig nutzbar — deine Listen liegen dann nur auf diesem Gerät.
        </p>
      </div>
    </AppSheet>
  </template>
</template>
