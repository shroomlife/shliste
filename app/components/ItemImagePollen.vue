<script setup lang="ts">
/**
 * Pollenflug: Der Server malt gerade das KI-Bild dieser Zeile (SHL-1, Idee 2
 * aus dem Entwurf). Ein warmer Schimmer gleitet durch die Zeile, ein paar
 * Pollen steigen auf und treiben leicht nach links.
 *
 * Bewusst verwandt mit dem Lichtlauf der Link-Vorschau (`busy-sweep`), aber
 * als eigener Zustand erkennbar: golden statt rosa, langsamer, mit Pollen.
 * Liegt hinter dem Text und fängt keine Taps ab (`pollen-flight` in main.css).
 * Ohne Bewegung bleibt ein ruhiger Schimmer, die Pollen fallen weg.
 */

/** Lage, Größe, Farbe und Takt der sechs Pollen, wie im Entwurf. */
const motes = [
  { left: '58%', size: 5, delay: '0s', gold: true },
  { left: '68%', size: 4, delay: '0.7s', gold: false },
  { left: '77%', size: 6, delay: '1.5s', gold: true },
  { left: '63%', size: 5, delay: '2.3s', gold: false },
  { left: '84%', size: 4, delay: '3s', gold: true },
  { left: '72%', size: 5, delay: '3.6s', gold: false },
].map(mote => ({
  ...mote,
  style: {
    left: mote.left,
    width: `${mote.size}px`,
    height: `${mote.size}px`,
    animationDelay: mote.delay,
    background: `radial-gradient(circle, ${mote.gold ? 'var(--md-pollen-gold)' : 'var(--md-primary)'} 0%, transparent 70%)`,
  },
}))
</script>

<template>
  <span
    class="pollen-flight"
    aria-hidden="true"
  >
    <span
      v-for="(mote, index) in motes"
      :key="index"
      class="pollen-mote"
      :style="mote.style"
    />
  </span>
</template>
