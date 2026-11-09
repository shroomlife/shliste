<script setup lang="ts">
const props = defineProps<{ active: boolean, title: string, compact?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const burst = ref(0)
const keepFilled = ref(false)

const sparks = Array.from({ length: 14 }, (_, index) => {
  const angle = (2 * Math.PI * index / 14) - Math.PI / 2
  const radius = index % 2 ? 52 : 71
  return {
    '--x': Math.round(Math.cos(angle) * radius) + 'px',
    '--y': Math.round(Math.sin(angle) * radius) + 'px',
    '--tilt': (index % 2 ? 18 : -22) + 'deg',
    '--delay': (index % 2) * 95 + (index % 3) * 12 + 'ms',
  }
})

function finishBurst(event: AnimationEvent) {
  if (event.animationName.startsWith('finish-burst')) burst.value = 0
}

async function toggle(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement
  const wasActive = props.active
  emit('toggle')
  await nextTick()
  if (!wasActive && props.active) {
    keepFilled.value = button.matches(':hover')
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) burst.value++
  }
  else {
    keepFilled.value = false
    burst.value = 0
  }
}
</script>

<template>
  <button
    type="button"
    class="recipe-heart"
    :class="{ 'keep-filled': keepFilled, 'has-burst': burst && active }"
    :aria-pressed="active"
    :aria-label="'Favorit: ' + title"
    :title="active ? 'Aus Gerätefavoriten entfernen' : 'Auf diesem Gerät merken'"
    @click="toggle"
    @pointerleave="keepFilled = false"
  >
    <span
      class="heart-glyph"
      aria-hidden="true"
    >
      <UIcon
        class="heart-normal"
        name="i-lucide-heart"
        mode="svg"
      />
      <UIcon
        class="heart-crack"
        name="i-lucide-heart-crack"
        mode="svg"
      />
    </span>
    <span v-if="!compact">{{ active ? 'Als Favorit gemerkt' : 'Als Favorit merken' }}</span>
    <span
      v-if="burst && active"
      :key="burst"
      class="heart-sparks"
      aria-hidden="true"
      @animationend.self="finishBurst"
    >
      <UIcon
        v-for="(style, index) in sparks"
        :key="index"
        name="i-lucide-heart"
        mode="svg"
        :style="style"
      />
    </span>
  </button>
</template>

<style scoped>
.recipe-heart {
  position: relative;
  overflow: visible;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 6px 12px;
  border-radius: 999px;
  color: var(--md-primary);
  background: var(--md-surface-container);
  font-weight: 650;
}
.recipe-heart[aria-pressed=true] { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.recipe-heart:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.heart-glyph { display: grid; place-items: center; width: var(--heart-size, 20px); height: var(--heart-size, 20px); }
.heart-glyph svg { grid-area: 1 / 1; width: 100%; height: 100%; }
.heart-crack { opacity: 0; }
.recipe-heart[aria-pressed=true] .heart-normal :deep(path), .heart-sparks :deep(path) { fill: currentColor; }
@media (hover: hover) and (pointer: fine) {
  .recipe-heart[aria-pressed=false]:hover {
    background: color-mix(in srgb, var(--md-primary) 12%, var(--md-surface));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--md-primary) 16%, transparent), 0 4px 14px #7d265520;
  }
  .recipe-heart[aria-pressed=false]:hover .heart-normal :deep(path) { fill: color-mix(in srgb, currentColor 18%, transparent); }
  .recipe-heart[aria-pressed=true]:hover:not(.keep-filled) .heart-crack { opacity: 1; }
  .recipe-heart[aria-pressed=true]:hover:not(.keep-filled) .heart-normal { opacity: 0; }
}
.heart-sparks { position: absolute; inset: 0; pointer-events: none; }
.heart-sparks svg {
  position: absolute;
  left: calc(50% - 7px);
  top: calc(50% - 7px);
  width: 14px;
  height: 14px;
  color: #bd397b;
  opacity: 0;
}
.heart-sparks svg:nth-child(3n) { color: #cc753d; }
.heart-sparks svg:nth-child(even) { color: #ed77aa; }
@media (prefers-reduced-motion: no-preference) {
  .heart-sparks::before, .heart-sparks::after {
    content: '';
    position: absolute;
    inset: 8%;
    border-radius: inherit;
    border: 2px solid #d44a8b;
    animation: heart-ring 640ms ease-out both;
  }
  .heart-sparks { border-radius: inherit; }
  .heart-sparks::after { animation-delay: 130ms; border-color: #f6a5b8; }
  .heart-glyph svg { transition: opacity 140ms ease; }
  .recipe-heart { transition: background-color 150ms, color 150ms; }
  .has-burst .heart-glyph { animation: heart-beat 720ms ease-out; }
  .heart-sparks { animation: finish-burst 1050ms linear; }
  .heart-sparks svg { animation: heart-spark 890ms var(--delay) ease-out both; }
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .recipe-heart[aria-pressed=false]:hover .heart-glyph { animation: heart-invitation 580ms ease-out both; }
  .recipe-heart[aria-pressed=true]:hover:not(.keep-filled) .heart-crack { transform: rotate(-8deg); }
  .heart-crack { transition: opacity 140ms ease, transform 180ms ease; }
}
@keyframes heart-invitation {
  0% { transform: scale(1); }
  45% { transform: translateY(-2px) scale(1.18) rotate(-9deg); }
  75% { transform: scale(1.04) rotate(2deg); }
  100% { transform: scale(1.1); }
}
@keyframes heart-beat {
  0% { transform: scale(.86); }
  28% { transform: scale(1.45) rotate(-8deg); }
  52% { transform: scale(.93) rotate(4deg); }
  74% { transform: scale(1.13); }
  100% { transform: scale(1); }
}
@keyframes heart-ring { from { opacity: .85; transform: scale(.65); } to { opacity: 0; transform: scale(2.1); } }
@keyframes heart-spark {
  0% { opacity: 0; transform: scale(.35); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--tilt)) scale(.75); }
}
@keyframes finish-burst { from { opacity: 1; } to { opacity: 1; } }
</style>
