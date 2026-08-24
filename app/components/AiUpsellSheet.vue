<script setup lang="ts">
/**
 * Was ein Konto freischaltet — statt eines Toasts, der nur „nein" sagt.
 *
 * Vorher erschien an sechs Stellen derselbe Hinweis „Anmeldung erforderlich".
 * Ein Toast ist die falsche Gattung dafür: Er verschwindet von selbst, er
 * trägt keine Handlung, und er beantwortet die einzig interessante Frage
 * nicht — WAS bekomme ich denn dafür? Wer gerade auf „Per Foto" getippt hat,
 * hat sein Interesse bereits gezeigt; das ist der Moment für ein Angebot, nicht
 * für eine Absage.
 *
 * Die Aufzählung nennt ausschliesslich Funktionen, die es wirklich gibt und
 * die man in dieser App auch findet. Nichts Angekündigtes, nichts Erfundenes.
 *
 * Und der Schlusssatz bleibt ehrlich: Die App ist ohne Konto vollständig
 * benutzbar. Ein Angebot, das den Verzicht verschweigt, wäre ein Verkauf.
 */
const open = defineModel<boolean>('open', { default: false })

const { clientConfig, signIn } = useAuth()
const toast = useToast()

const hasClientId = computed(() => clientConfig.value.googleClientId.length > 0)

/** Läuft gerade der Tausch des ID-Tokens gegen eine Sitzung? */
const isExchanging = ref(false)

/**
 * Wohin Google seinen Knopf zeichnet.
 *
 * Existiert erst, wenn der Dialog offen ist — `UModal` und `UDrawer` hängen
 * ihren Inhalt beim Öffnen in den DOM. Das Composable beobachtet den Ref und
 * zeichnet, sobald das Element da ist. Dieselbe Mechanik wie in
 * `AuthButton.vue`; die Begründung dazu steht dort.
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
  }
  catch (error) {
    console.warn('[AiUpsell] Anmeldung fehlgeschlagen:', error)
    toast.add({
      title: 'Anmeldung fehlgeschlagen',
      description: 'Die App bleibt ohne Konto vollständig nutzbar.',
      icon: 'i-lucide-triangle-alert',
      color: 'error',
    })
  }
  finally {
    isExchanging.value = false
  }
}

/** Nur Vorhandenes. Reihenfolge: erst das Erschaffen, dann das Verfeinern. */
const funktionen = [
  {
    icon: 'i-lucide-camera',
    title: 'Aus Foto, Sprache oder Link',
    text: 'Fotografier einen Kassenzettel, sprich deine Liste ein oder wirf einen Rezept-Link hinein.',
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'Passende Vorschläge',
    text: 'Die App schlägt vor, was zu deiner Liste noch fehlt.',
  },
  {
    icon: 'i-lucide-wand-sparkles',
    title: 'Umschreiben lassen',
    text: 'Mengen anpassen, Schritte ordnen, Zutaten ergänzen. Im Gespräch statt von Hand.',
  },
  {
    icon: 'i-lucide-message-circle',
    title: 'Rezept-Chat und Erklärungen',
    text: 'Frag nach, was ein Schritt bedeutet oder wodurch sich eine Zutat ersetzen lässt.',
  },
  {
    icon: 'i-lucide-image-plus',
    title: 'Bild zum Rezept',
    text: 'Rezepte ohne Foto bekommen eins erzeugt.',
  },
]
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Mit Konto kommt die AI dazu"
    description="Mit Google anmelden, und die App denkt mit."
  >
    <div class="flex flex-col gap-5">
      <ul class="flex flex-col gap-4">
        <li
          v-for="funktion in funktionen"
          :key="funktion.title"
          class="flex items-start gap-3.5"
        >
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style="background: var(--md-secondary-container); color: var(--md-on-secondary-container)"
          >
            <UIcon
              :name="funktion.icon"
              class="size-5"
            />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-[1.125rem] font-bold">{{ funktion.title }}</span>
            <span
              class="text-[1rem]"
              style="color: var(--md-on-surface-variant)"
            >{{ funktion.text }}</span>
          </span>
        </li>
      </ul>

      <!-- Der ehrliche Teil. Ein Angebot, das den Verzicht verschweigt, wäre
           ein Verkauf: Ohne Konto fehlt nichts ausser der AI. -->
      <p
        class="rounded-xl px-4 py-3 text-[1rem]"
        style="background: var(--md-surface-low); color: var(--md-on-surface-variant)"
      >
        Listen, Rezepte und der Einkauf funktionieren auch ohne Konto, vollständig und offline.
        Ein Konto bringt zusätzlich den Abgleich über deine Geräte und das Teilen von Listen.
      </p>
    </div>

    <template #footer>
      <div class="flex w-full flex-col items-center gap-2">
        <div
          v-if="hasClientId"
          ref="buttonHost"
          class="flex min-h-11 items-center justify-center"
        />
        <p
          v-else
          class="text-center text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Die Anmeldung ist gerade nicht erreichbar. Versuch es später noch einmal.
        </p>

        <p
          v-if="renderError !== null"
          class="text-center text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Googles Anmeldeknopf konnte nicht geladen werden.
        </p>
        <p
          v-else-if="isExchanging"
          class="text-center text-[0.9375rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Einen Moment …
        </p>
      </div>
    </template>
  </AppSheet>
</template>
