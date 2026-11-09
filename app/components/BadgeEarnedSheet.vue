<script setup lang="ts">
import RecipeBadgeConfetti from './RecipeBadgeConfetti.vue'
import RecipeBadgePlate from './RecipeBadgePlate.vue'

import type { IsoUtc } from '#shared/types/domain'

const { badge, imageUrl, replay = false, celebrateTick = 0 } = defineProps<{
  /** Die frisch verdiente Auszeichnung — `null`, solange keine ansteht. */
  badge: { recipeName: string, earnedAt: IsoUtc } | null
  /** Jede Erhöhung startet die kurze Wiederholungs-Feier ohne Sheet. */
  replay?: boolean
  imageUrl?: string | null
  celebrateTick?: number
}>()

/** Offen-Zustand liegt beim Aufrufer — wie bei jedem Dialog der App. */
const open = defineModel<boolean>('open', { default: false })

const showcase = useTemplateRef<HTMLDialogElement>('showcase')
const titleId = useId()
watchPostEffect(() => {
  const dialog = showcase.value
  if (open.value && dialog && !dialog.open) dialog.showModal()
  if (!open.value && dialog?.open) dialog.close()
})

function dismissBackdrop(event: MouseEvent) {
  const dialog = showcase.value
  if (!dialog || event.target !== dialog) return
  const bounds = dialog.querySelector('.badge-earned')?.getBoundingClientRect() ?? dialog.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) open.value = false
}

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
  <Teleport to="body">
    <dialog
      ref="showcase"
      role="dialog"
      class="badge-showcase"
      :class="{ 'award-spotlights': !replay, 'badge-replay': replay }"
      :aria-labelledby="titleId"
      @cancel.prevent="open = false"
      @click="dismissBackdrop"
    >
      <div
        v-if="open"
        class="badge-earned"
      >
        <button
          class="badge-earned__button"
          type="button"
          autofocus
          aria-label="Schließen"
          @click="open = false"
        >
          <UIcon
            name="i-lucide-x"
            mode="svg"
          />
        </button>
        <RecipeBadgeConfetti
          v-if="!replay"
          award
        />

        <RecipeBadgePlate
          :name="badge?.recipeName"
          :earned-date="earnedDate"
          :image-url="imageUrl"
          :title-id="titleId"
          :replay="replay"
        />
      </div>
    </dialog>
  </Teleport>

  <!-- Die Wiederholungs-Feier: dieselben Spans, als Schicht über allem.
       pointer-events bleibt aus — gefeiert wird, bedient wird trotzdem. -->
  <Teleport to="body">
    <RecipeBadgeConfetti
      v-if="isCelebrating"
      overlay
    />
  </Teleport>
</template>

<style scoped>
.badge-showcase {
  --badge-gutter: clamp(8px, 4vw, 48px);
  width: min(calc(31rem + 2 * var(--badge-gutter)),calc(100vw - 1rem)); max-width: none; max-height: calc(100dvh - 2rem); margin: auto;
  padding: var(--badge-gutter); border: 0; border-radius: .95rem .95rem 1.65rem 1.65rem;
  color: #fff2da; background: transparent; box-shadow: none;
  overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin;
}
.badge-showcase::backdrop { background: rgb(33 17 33 / 36%); }
@media (prefers-reduced-motion: no-preference) {
  .badge-showcase.award-spotlights[open]::backdrop { animation: gallery-dim 850ms ease-out both; }
}
.badge-earned { position: relative; isolation: isolate; text-align: center; }
.badge-earned > :deep(.confetti) { inset: calc(-1 * var(--badge-gutter)); }
@media (prefers-reduced-motion: no-preference) {
  .badge-showcase[open] { animation: plaque-unveil 340ms cubic-bezier(.18,.80,.21,1) both; transform-origin: 50% 57%; }
  .badge-showcase.badge-replay[open]::backdrop { animation: gallery-dim 220ms ease-out both; }
}
@keyframes plaque-unveil { from { transform: translateY(8px) scale(.965); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes gallery-dim { from { background-color: transparent; } to { background-color: rgb(33 17 33 / 36%); } }
.badge-earned__button {
  position: absolute; z-index: 3; top: .85rem; right: .85rem; display: grid; place-items: center;
  width: 44px; height: 44px; border: 1px solid #e9c99b; border-radius: 50%; cursor: pointer;
  background: #3d2539; color: #fff2da; box-shadow: 0 2px 8px #1c0c213d;
}
.badge-earned__button svg { width: 20px; height: 20px; }
.badge-earned__button:hover { background: #633a51; }
.badge-earned__button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
</style>
