<script setup lang="ts">
/**
 * „Deine Anmeldung ist abgelaufen" — der sichtbare Re-Login (Audit K2).
 *
 * Erscheint, wenn der Abgleich `authRequired` meldet, also erst NACHDEM der
 * stille Refresh der BFF endgültig gescheitert ist (Widerruf, abgelaufenes
 * Refresh-Token, Legacy-Session am Laufzeitende). Vorher merkt der Nutzer
 * vom Ablauf der Sitzung nichts — genau das ist der Sinn des Umbaus.
 *
 * Geöffnet wird das Blatt vom Sync-Runner (useSync.ts) über
 * `useSessionExpiredSheet()`; hierher gehört nur, was das Blatt selbst tut:
 * Googles Knopf zeichnen, das ID-Token gegen eine neue Sitzung tauschen,
 * danach schließen und sofort abgleichen — die aufgelaufenen lokalen
 * Änderungen sollen nicht auf den nächsten Anlass warten.
 *
 * Dismissbar mit Absicht: Wer gerade keine Zeit für den Login hat, arbeitet
 * lokal weiter (die App braucht kein Konto). Die Abgleich-Anzeige bleibt
 * derweil im Fehlerzustand sichtbar, und der nächste Anmeldeversuch ist
 * jederzeit über den Anmelden-Knopf möglich.
 */
const open = useSessionExpiredSheet()

const { isSignedIn, signIn } = useAuth()
const { requestSync } = useSync()
const toast = useToast()

/** Läuft gerade der Tausch des ID-Tokens gegen eine Sitzung? */
const isExchanging = ref(false)

/**
 * Wohin Google seinen Knopf zeichnet. Existiert erst, wenn das Blatt offen
 * ist; das Composable beobachtet den Ref und zeichnet dann.
 */
const buttonHost = useTemplateRef<HTMLElement>('buttonHost')

const { renderError } = useGoogleSignInButton(buttonHost, (idToken) => {
  void completeSignIn(idToken)
})

async function completeSignIn(idToken: string): Promise<void> {
  isExchanging.value = true
  try {
    await signIn(idToken)
    open.value = false
    // Sofort abgleichen: Während die Sitzung tot war, sind lokale Änderungen
    // aufgelaufen — die sollen jetzt raus, nicht erst beim nächsten Anlass.
    await requestSync()
  }
  catch (error) {
    console.warn('[SessionExpiredSheet] Anmeldung fehlgeschlagen:', error)
    toast.add({
      title: 'Anmeldung fehlgeschlagen',
      description: 'Deine Listen bleiben auf diesem Gerät erhalten. Versuche es gleich noch einmal.',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  }
  finally {
    isExchanging.value = false
  }
}

// Meldet sich der Nutzer anderswo neu an (etwa über den Anmelden-Knopf im
// Layout), ist dieses Blatt erledigt und schließt sich von selbst.
watch(isSignedIn, (signedIn) => {
  if (signedIn) open.value = false
})
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Deine Anmeldung ist abgelaufen"
    description="Melde dich neu an, damit deine Änderungen weiter abgeglichen werden. Deine Listen bleiben auf diesem Gerät erhalten."
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
        Du kannst auch später weitermachen. Bis dahin arbeitest du lokal auf diesem Gerät.
      </p>
    </div>
  </AppSheet>
</template>
