<script setup lang="ts">
/**
 * Anmelden — der Auslöser für Googles Anmeldeknopf. Das Abmelden liegt auf
 * der Profilseite; sie nimmt dort auch Googles Konto-Merken
 * (disableAutoSelect) zurück.
 *
 * Die App funktioniert ohne Konto vollständig. Dieser Knopf schaltet
 * ausschliesslich Abgleich und Teilen frei; er hält nichts auf und sperrt
 * nichts. Scheitert hier etwas, bleibt die App genau so benutzbar wie vorher.
 *
 * WARUM EIN DIALOG UND NICHT DER KNOPF DIREKT: Googles eigener Knopf
 * (`renderButton`) muss gezeichnet werden und braucht dafür Platz — die
 * Icon-Rail ist 84 Pixel breit, die Kopfzeile auf dem Handy kaum mehr.
 * Deshalb öffnet unser Knopf einen Dialog, und darin steht Googles Knopf in
 * voller Grösse. Warum überhaupt `renderButton` statt One Tap, wie das Skript
 * geladen wird und was FedCM damit zu tun hat, steht gesammelt im Composable
 * `useGoogleSignInButton` — dieselbe Logik zeichnet auch den Knopf im Blatt
 * „Anmeldung abgelaufen" (SessionExpiredSheet.vue).
 */

/**
 * `compact` lässt die Beschriftung weg. Die Icon-Rail auf dem Desktop ist nur
 * 84 Pixel breit — ein beschrifteter Knopf ragt dort heraus und wird
 * abgeschnitten. Die Bedeutung trägt dann `aria-label` und `title`.
 */
const { compact = false } = defineProps<{ compact?: boolean }>()

const { clientConfig, isSignedIn, signIn } = useAuth()
const toast = useToast()

// NICHT aus `runtimeConfig.public`: Der App-Bereich wird vorgerendert, und
// dabei wird die öffentliche Konfiguration zur Bauzeit eingebacken — im
// Docker-Build, wo keine Umgebungsvariablen stehen. Genau daran ist der Knopf
// in Produktion hängen geblieben. Der Wert kommt jetzt vom Server (siehe
// server/api/auth/me.get.ts).
const hasClientId = computed(() => clientConfig.value.googleClientId.length > 0)

/** Der Anmeldedialog mit Googles Knopf darin. */
const isDialogOpen = ref(false)

/** Läuft gerade der Tausch des ID-Tokens gegen eine Sitzung? */
const isExchanging = ref(false)

/**
 * Wohin Google seinen Knopf zeichnet.
 *
 * Existiert erst, wenn der Dialog offen ist: Sowohl `UModal` als auch
 * `UDrawer` hängen ihren Inhalt beim Öffnen in den DOM. Das Composable
 * beobachtet den Ref und zeichnet, sobald das Element da ist.
 */
const buttonHost = useTemplateRef<HTMLElement>('buttonHost')

const { renderError } = useGoogleSignInButton(buttonHost, (idToken) => {
  void completeSignIn(idToken)
})

async function completeSignIn(idToken: string): Promise<void> {
  isExchanging.value = true
  try {
    await signIn(idToken)
    isDialogOpen.value = false
  }
  catch (error) {
    reportFailure('Anmeldung fehlgeschlagen', error)
  }
  finally {
    isExchanging.value = false
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
  <!-- Angemeldet zeigt dieser Baustein nichts: Der Profil-Knopf im Layout
       führt zum Konto, abgemeldet wird auf der Profilseite. Das frühere
       Avatar-Menü an dieser Stelle wäre neben dem Profil-Knopf ein zweites
       Element mit derselben Aussage gewesen. -->
  <template v-if="!isSignedIn">
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
