<script setup lang="ts">
defineProps<{ award?: boolean, overlay?: boolean }>()

// Mirrored launch points, with different arcs and fall times for each fleck.
const confettiPieces = Array.from({ length: 36 }, (_, i) => {
  const side = i % 2 === 0 ? 1 : -1
  const arc = (i * 7) % 17
  return {
    'left': side === 1 ? '5%' : '95%',
    '--travel': (side * (38 + arc * 7)) + 'px',
    '--rise': (-45 - arc * 6) + 'px',
    '--spin': (side * (135 + arc * 24)) + 'deg',
    '--wait': (120 + (i % 6) * 50) + 'ms',
    '--award-wait': ((i < 18 ? 700 : 3100) + (i % 6) * 74) + 'ms',
    '--award-flight': (1780 + (i % 7) * 83) + 'ms',
    '--flight': (1050 + (i % 7) * 88) + 'ms',
  }
})
</script>

<template>
  <div
    class="confetti"
    :class="{ 'confetti--award': award, 'confetti--overlay': overlay }"
    aria-hidden="true"
  >
    <span
      v-for="(style, index) in confettiPieces"
      :key="index"
      :style="style"
    />
  </div>
</template>

<style scoped>
.confetti {
  --gold-dark: #b8860b;
  --gold-mid: #daa520;
  --gold-bright: #ffd700;
  --gold-light: #ffe88d;
}

.confetti { position: absolute; inset: 0; z-index: 2; overflow: hidden; pointer-events: none; }
.confetti--overlay { position: fixed; z-index: 60; }
.confetti span {
  position: absolute; top: 47%; width: .38rem; height: .62rem; border-radius: 2px;
  background: var(--gold-light); opacity: 0;
  animation: confetti-flight var(--flight) var(--wait) linear both;
}
.confetti span:nth-child(3n) { width: .35rem; height: .35rem; border-radius: 50%; }
@keyframes confetti-flight {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); animation-timing-function: ease-out; }
  12% { opacity: .95; }
  44% { transform: translate(calc(var(--travel) * .62), var(--rise)) rotate(calc(var(--spin) * .45)); animation-timing-function: ease-in; }
  70% { opacity: .85; }
  100% { opacity: 0; transform: translate(var(--travel), 68px) rotate(var(--spin)); }
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

@media (prefers-reduced-motion: reduce) {
  /* Ohne Bewegung: kein Konfetti. Ein eingefrorener Teilchenregen wäre nur
     Rauschen vor dem Inhalt. */
  .confetti {
    display: none;
  }
}

.confetti--award span { animation-duration: var(--award-flight); animation-delay: var(--award-wait); }
</style>
