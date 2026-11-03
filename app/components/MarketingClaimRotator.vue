<script setup lang="ts">
/**
 * Sims-artiger Claim-Wechsel: Text crossfadet, die Pill-Breite folgt dem
 * jeweiligen Claim (kein fester Min-Width-Leerraum).
 */
const props = withDefaults(defineProps<{
  claims: readonly string[]
  intervalMs?: number
}>(), {
  intervalMs: 3200,
})
const index = ref(0)
const reduced = ref(false)
const slotWidth = ref<number | null>(null)
const measureEl = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
const current = computed(() => props.claims[index.value] ?? props.claims[0] ?? '')
function measureWidth() {
  const el = measureEl.value
  if (!el)
    return
    // Aufrunden vermeidet Subpixel-Clipping am rechten Rand
  slotWidth.value = Math.ceil(el.getBoundingClientRect().width)
}
async function showNext() {
  index.value = (index.value + 1) % props.claims.length
  await nextTick()
  measureWidth()
}
onMounted(async () => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  await nextTick()
  measureWidth()
  if (reduced.value || props.claims.length < 2)
    return
  timer = setInterval(() => {
    void showNext()
  }, props.intervalMs)
})
onBeforeUnmount(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <p
    class="claim-pill mb-6"
    :aria-live="reduced ? undefined : 'polite'"
  >
    <span
      class="live-dot"
      aria-hidden="true"
    />
    <UIcon
      name="i-lucide-sparkles"
      class="claim-icon"
      aria-hidden="true"
    />

    <!-- Unsichtbarer Messer: gleiche Typo, bestimmt die Zielbreite -->
    <span
      ref="measureEl"
      class="claim-measure"
      aria-hidden="true"
    >{{ current }}</span>

    <span
      class="claim-slot"
      :style="slotWidth != null ? { width: `${slotWidth}px` } : undefined"
    >
      <Transition
        name="claim-fade"
        mode="out-in"
      >
        <span
          :key="current"
          class="claim-text"
        >{{ current }}</span>
      </Transition>
    </span>
  </p>
</template>

<style scoped>
.claim-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  min-height: 2.5rem;
  max-width: 100%;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: var(--demo-accent);
  background: var(--md-surface-container);
  width: fit-content;
}
:global(.dark) .claim-pill { color: var(--md-primary); }

.live-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 45%, transparent);
  animation: pulse-dot 2.2s ease-out infinite;
}
@keyframes pulse-dot {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 45%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.claim-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
}

.claim-measure {
  position: absolute;
  left: 0;
  top: 0;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
  font: inherit;
  letter-spacing: inherit;
}

.claim-slot {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
  overflow: hidden;
  vertical-align: middle;
  transition: width 520ms cubic-bezier(0.4, 0, 0.2, 1);
}

.claim-text {
  display: block;
  white-space: nowrap;
  line-height: 1.25rem;
}

.claim-fade-enter-active,
.claim-fade-leave-active {
  transition: opacity 320ms ease, transform 320ms cubic-bezier(0.34, 1.05, 0.64, 1);
}
.claim-fade-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.claim-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (prefers-reduced-motion: reduce) {
  .live-dot { animation: none; }
  .claim-slot { transition: none; }
  .claim-fade-enter-active,
  .claim-fade-leave-active { transition: none; }
}
</style>
