<script setup lang="ts">
import type { IsoUtc } from '#shared/types/domain'

/**
 * Die Badge-Zeremonie — das Pendant zu `BadgeEarnedSheet.kt` und
 * `RecipeCelebration.kt` der Android-App, mit Konfetti in reinem CSS.
 *
 * Zwei Auftritte in einer Komponente, damit die Konfetti-Spans nur einmal
 * existieren:
 *
 * 1. Das Sheet (`open`): erstes Fertigkochen eines Rezepts. Goldpalette
 *    (#B8860B / #DAA520 / #FFD700 / #FFE88D), Rezeptname gross, Datum,
 *    Knopf "Toll!".
 * 2. Die kurze Feier (`celebrateTick`): das Rezept trägt schon eine
 *    Auszeichnung und wurde erneut fertig gekocht — drei Sekunden Konfetti
 *    als Overlay, ohne Sheet.
 *
 * Unter `prefers-reduced-motion: reduce` bewegt sich nichts: Das Konfetti
 * entfällt komplett, der Inhalt steht sofort still da.
 */
const { badge, celebrateTick = 0 } = defineProps<{
  /** Die frisch verdiente Auszeichnung — `null`, solange keine ansteht. */
  badge: { recipeName: string, earnedAt: IsoUtc } | null
  /** Jede Erhöhung startet die kurze Wiederholungs-Feier ohne Sheet. */
  celebrateTick?: number
}>()

/** Offen-Zustand liegt beim Aufrufer — wie bei jedem Dialog der App. */
const open = defineModel<boolean>('open', { default: false })

const earnedDate = computed(() => {
  if (badge === null) return ''
  return new Date(badge.earnedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})

/** Läuft gerade die Wiederholungs-Feier? Drei Sekunden, wie in Android. */
const isCelebrating = ref(false)
let celebrationTimer: ReturnType<typeof setTimeout> | null = null

watch(() => celebrateTick, async (tick, previous) => {
  if (tick === previous || tick === 0) return

  // Erst aus- und im nächsten Tick wieder einblenden: Sonst liefe eine noch
  // laufende Feier einfach weiter, statt von vorn zu beginnen.
  if (celebrationTimer !== null) clearTimeout(celebrationTimer)
  isCelebrating.value = false
  await nextTick()

  isCelebrating.value = true
  celebrationTimer = setTimeout(() => {
    isCelebrating.value = false
    celebrationTimer = null
  }, 3000)
})

onBeforeUnmount(() => {
  if (celebrationTimer !== null) clearTimeout(celebrationTimer)
})
</script>

<template>
  <AppSheet
    v-model:open="open"
    title="Badge verdient!"
  >
    <div class="badge-earned relative flex flex-col items-center gap-4 overflow-hidden px-2 py-6 text-center">
      <div
        class="confetti"
        aria-hidden="true"
      >
        <span
          v-for="n in 40"
          :key="n"
        />
      </div>

      <!-- Die goldene Plakette: Verlaufskante wie der animierte Goldrahmen
           der Android-App, nur ruhig — bewegt wird hier allein das Konfetti. -->
      <div class="badge-earned__plate flex flex-col items-center gap-1.5 rounded-2xl px-8 py-6">
        <p class="badge-earned__name text-[1.75rem] leading-tight font-extrabold">
          {{ badge?.recipeName }}
        </p>
        <p
          class="text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Verdient am {{ earnedDate }}
        </p>
      </div>

      <UButton
        class="badge-earned__button rounded-xl px-8 font-bold"
        size="xl"
        @click="open = false"
      >
        Toll!
      </UButton>
    </div>
  </AppSheet>

  <!-- Die Wiederholungs-Feier: dieselben Spans, als Schicht über allem.
       pointer-events bleibt aus — gefeiert wird, bedient wird trotzdem. -->
  <Teleport to="body">
    <div
      v-if="isCelebrating"
      class="confetti confetti--overlay"
      aria-hidden="true"
    >
      <span
        v-for="n in 40"
        :key="n"
      />
    </div>
  </Teleport>
</template>

<style scoped>
/* Die Gold-Palette der Android-Zeremonie — nirgendwo sonst verwendet,
   deshalb lokale Variablen statt neuer App-Tokens. */
.badge-earned,
.confetti {
  --gold-dark: #b8860b;
  --gold-mid: #daa520;
  --gold-bright: #ffd700;
  --gold-light: #ffe88d;
}

/* Verlaufskante über background-clip: zwei Hintergründe, der äussere ist der
   Goldverlauf, der innere die Fläche — ergibt einen Goldrahmen ohne Pseudo-
   Element und funktioniert in beiden Themes. */
.badge-earned__plate {
  border: 3px solid transparent;
  background:
    linear-gradient(var(--md-surface), var(--md-surface)) padding-box,
    linear-gradient(135deg, var(--gold-dark), var(--gold-bright), var(--gold-light), var(--gold-bright), var(--gold-dark)) border-box;
}

.badge-earned__name {
  color: var(--gold-dark);
}

.badge-earned__button {
  background: var(--gold-mid);
  color: white;
}

.badge-earned__button:hover {
  background: var(--gold-dark);
}

/* ------------------------------------------------------------------ *
 * Konfetti — ~40 absolut positionierte Spans, reine CSS-Animation.
 * Winkel, Versatz und Verzögerung entstehen aus überlagerten nth-child-
 * Rastern (5n, 6n, 7n …): teilerfremde Perioden ergeben eine Streuung,
 * die erst nach ihrem kleinsten gemeinsamen Vielfachen wiederkehrt —
 * für 40 Spans sieht das hinreichend zufällig aus. Keine Bibliothek.
 * ------------------------------------------------------------------ */
.confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  /* Wie weit ein Teilchen fällt: im Sheet bis unter die Kante des Inhalts. */
  --fall: 30rem;
}

.confetti--overlay {
  position: fixed;
  z-index: 60;
  --fall: 110vh;
}

.confetti span {
  position: absolute;
  top: -5%;
  width: 0.5rem;
  height: 0.875rem;
  border-radius: 2px;
  opacity: 0;
  background: var(--gold-bright);
  animation: confetti-fall 2.6s linear infinite;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate3d(var(--tilt, 1), 1, 0.5, 0deg);
  }

  100% {
    opacity: 1;
    transform: translate3d(var(--sway, 0.75rem), var(--fall), 0) rotate3d(var(--tilt, 1), 1, 0.5, var(--spin, 660deg));
  }
}

/* Farben: Gold führt, dazu die vier Akzente der Android-Konfetti-Party. */
.confetti span:nth-child(8n + 1) { background: var(--gold-bright); }
.confetti span:nth-child(8n + 2) { background: var(--gold-mid); }
.confetti span:nth-child(8n + 3) { background: var(--gold-light); }
.confetti span:nth-child(8n + 4) { background: #fff8dc; }
.confetti span:nth-child(8n + 5) { background: #ff6b6b; }
.confetti span:nth-child(8n + 6) { background: #4ecdc4; }
.confetti span:nth-child(8n + 7) { background: #aa96da; }
.confetti span:nth-child(8n) { background: #fcbf49; }

/* Horizontale Verteilung: Grundraster … */
.confetti span:nth-child(5n + 1) { left: 6%; }
.confetti span:nth-child(5n + 2) { left: 26%; }
.confetti span:nth-child(5n + 3) { left: 46%; }
.confetti span:nth-child(5n + 4) { left: 66%; }
.confetti span:nth-child(5n) { left: 86%; }

/* … plus Versatz aus einem teilerfremden Raster, damit keine Spalten entstehen. */
.confetti span:nth-child(3n + 1) { margin-left: 2%; }
.confetti span:nth-child(3n + 2) { margin-left: 7%; }

/* Winkel und Drall */
.confetti span:nth-child(2n) { --spin: -540deg; --sway: -1rem; }
.confetti span:nth-child(4n + 1) { --tilt: 0.4; --spin: 780deg; }
.confetti span:nth-child(4n + 3) { --tilt: 1.6; --sway: 1.5rem; }

/* Verzögerungen */
.confetti span:nth-child(7n + 2) { animation-delay: 0.35s; }
.confetti span:nth-child(7n + 3) { animation-delay: 0.7s; }
.confetti span:nth-child(7n + 4) { animation-delay: 1.05s; }
.confetti span:nth-child(7n + 5) { animation-delay: 1.4s; }
.confetti span:nth-child(7n + 6) { animation-delay: 1.75s; }
.confetti span:nth-child(7n) { animation-delay: 2.1s; }

/* Fallgeschwindigkeiten */
.confetti span:nth-child(6n + 1) { animation-duration: 2.2s; }
.confetti span:nth-child(6n + 4) { animation-duration: 3.1s; }

@media (prefers-reduced-motion: reduce) {
  /* Ohne Bewegung: kein Konfetti. Ein eingefrorener Teilchenregen wäre nur
     Rauschen vor dem Inhalt. */
  .confetti {
    display: none;
  }
}
</style>
