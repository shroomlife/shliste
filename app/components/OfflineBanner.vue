<script setup lang="ts">
/**
 * Schmale Leiste unter dem Kopf, solange keine Verbindung besteht — das
 * Pendant zu `components/OfflineBanner.kt` der Android-App.
 *
 * Bewusst ohne Props: Der Netzwerkzustand ist einer für die ganze App
 * (`useNetworkStatus`), und das Layout mountet die Leiste genau einmal.
 *
 * Zwei Botschaften, weil zwei Wahrheiten: Wer angemeldet ist, dem wird
 * nachsynchronisiert; wer nicht, dessen Daten leben ohnehin nur hier. Beide
 * Sätze nehmen dem Moment die Sorge, statt einen Fehler zu behaupten.
 */
const { isOnline } = useNetworkStatus()
const { isSignedIn } = useAuth()

const message = computed(() =>
  isSignedIn.value
    ? 'Offline. Änderungen gehen raus, sobald du wieder Netz hast'
    : 'Offline. Deine Listen funktionieren weiter',
)
</script>

<template>
  <!-- Der sichtbare Teil bleibt immer im DOM: Die Höhen-Transition über
       grid-template-rows braucht den Inhalt auch während des Zuklappens.
       Angesagt wird stattdessen über die unsichtbare Statuszeile darunter. -->
  <div
    class="offline-banner"
    :class="{ 'offline-banner--visible': !isOnline }"
    aria-hidden="true"
  >
    <div class="offline-banner__clip">
      <div class="offline-banner__row">
        <UIcon
          name="i-lucide-cloud-off"
          class="size-4 shrink-0"
        />
        <span class="text-[1rem]">{{ message }}</span>
      </div>
    </div>
  </div>

  <!-- Eigene Live-Region statt role="status" auf der Leiste: Deren Inhalt
       steht dauerhaft im DOM und würde beim Offline-Gehen nichts "ändern",
       also auch nichts ansagen. Hier wechselt der Text wirklich. -->
  <span
    class="sr-only"
    role="status"
  >{{ isOnline ? '' : message }}</span>
</template>

<style scoped>
/* Höhen-Transition ohne Höhenmessung: grid-template-rows 0fr -> 1fr lässt
   die Zeile auf ihre natürliche Höhe wachsen, der innere Clip schneidet
   während der Bewegung ab. Kein JavaScript, kein magischer max-height-Wert. */
.offline-banner {
  display: grid;
  grid-template-rows: 0fr;
  background: var(--md-surface-variant);
  color: var(--md-on-surface-variant);
  transition: grid-template-rows 0.25s ease;
}

.offline-banner--visible {
  grid-template-rows: 1fr;
}

.offline-banner__clip {
  overflow: hidden;
  min-height: 0;
}

.offline-banner__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .offline-banner {
    transition: none;
  }
}
</style>
