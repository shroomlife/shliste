/**
 * Googles Anmeldeknopf (GIS `renderButton`) als wiederverwendbares Composable.
 *
 * Zwei Stellen zeichnen diesen Knopf: der reguläre Anmeldedialog
 * (`AuthButton.vue`) und das Blatt „Anmeldung abgelaufen"
 * (`SessionExpiredSheet.vue`). Die Lade- und Render-Logik lebt deshalb genau
 * einmal hier statt als Kopie in beiden Komponenten.
 *
 * WARUM `renderButton` UND NICHT `prompt()` (One Tap): Google dokumentiert
 * ausdrücklich, dass One Tap NICHT verlässlich erscheint — wer es dreimal
 * wegklickt, sieht es eine Woche lang nicht mehr (danach vier Wochen), und
 * wer „Anmeldung bei Drittanbietern" im Browser abschaltet, sieht es nie.
 * Ein Anmeldeknopf, der daran hängt, tut bei genau diesen Leuten scheinbar
 * nichts. `renderButton` ist der dokumentierte Weg für eine ausdrückliche
 * Anmeldung und erscheint immer.
 *
 * Das Skript von Google wird erst geladen, wenn ein Ziel-Element auftaucht,
 * und nie auf dem Server: Es taugt dort nicht (es braucht `document`), und
 * eine App, die man ohne Konto benutzt, soll für einen blossen Besuch keine
 * fremde Verbindung öffnen.
 *
 * Das ID-Token wird hier nur entgegengenommen und weitergereicht. Geprüft
 * wird es von api.shliste.app (Signatur, Aussteller, aud) — eine Prüfung im
 * Browser wäre wertlos, weil der Browser die Antwort selbst stellt.
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
 * Das laufende Laden des Skripts. Auf Modulebene, weil das Skript pro Seite
 * nur einmal existieren darf — zwei Konsumenten (AuthButton und
 * SessionExpiredSheet) teilen sich denselben Ladevorgang, und
 * `readGoogleIdentityApi` fängt zusätzlich den Fall ab, dass eine andere
 * Stelle die Bibliothek bereits geladen hat.
 */
let scriptLoad: Promise<GoogleIdentityApi> | null = null

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

export interface UseGoogleSignInButton {
  /** Konnte der Knopf nicht gezeichnet werden, steht hier der Grund für den Nutzer. */
  renderError: Readonly<Ref<string | null>>
}

/**
 * Zeichnet Googles Knopf in das übergebene Ziel-Element, sobald es existiert.
 *
 * `host` ist der Template-Ref auf den Rahmen im Dialog: Er entsteht erst beim
 * Öffnen (UModal/UDrawer hängen ihren Inhalt beim Öffnen in den DOM), deshalb
 * beobachtet das Composable den Ref statt im Klick zu rendern — im Moment des
 * Klicks existiert das Element noch gar nicht.
 *
 * `onCredential` bekommt das rohe ID-Token und tauscht es beim Aufrufer gegen
 * eine Sitzung; Fehlerbehandlung und Ladezustand bleiben Sache der Komponente,
 * weil nur sie weiss, wie sie beides anzeigen will.
 */
export function useGoogleSignInButton(
  host: Readonly<Ref<HTMLElement | null | undefined>>,
  onCredential: (idToken: string) => void,
): UseGoogleSignInButton {
  const { clientConfig } = useAuth()
  const renderError = ref<string | null>(null)

  async function renderGoogleButton(target: HTMLElement): Promise<void> {
    renderError.value = null

    try {
      const identity = await loadGoogleIdentity()

      identity.accounts.id.initialize({
        client_id: clientConfig.value.googleClientId,
        callback: (response) => {
          onCredential(response.credential)
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
      target.replaceChildren()

      identity.accounts.id.renderButton(target, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: measureButtonWidth(target),
        // Fest auf Deutsch: Ohne Angabe richtet sich Google nach dem Konto des
        // Besuchers, und der Knopf bekäme je nach Sprache eine andere Breite.
        locale: 'de',
      })
    }
    catch (error) {
      console.warn('[useGoogleSignInButton] Googles Anmeldeknopf konnte nicht gezeichnet werden:', error)
      renderError.value = 'Der Anmeldeknopf von Google liess sich nicht laden. Prüfe die Verbindung und versuche es noch einmal.'
    }
  }

  watch(host, (target) => {
    if (target === null || target === undefined) return
    void renderGoogleButton(target)
  })

  return { renderError: readonly(renderError) }
}
