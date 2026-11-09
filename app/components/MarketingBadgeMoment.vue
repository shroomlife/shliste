<script setup lang="ts">
import RecipeBadgeConfetti from './RecipeBadgeConfetti.vue'
import RecipeBadgePlate from './RecipeBadgePlate.vue'

defineProps<{ name: string, image: string, date: string, collection: boolean }>()
</script>

<template>
  <div
    class="badge-moment"
    :class="{ album: collection }"
  >
    <RecipeBadgeConfetti
      v-if="!collection"
      award
    />
    <strong v-if="collection">Meine Badges</strong>
    <RecipeBadgePlate
      :key="String(collection)"
      :name="name"
      :image-url="image"
      :earned-date="date"
      :compact="collection"
    />
  </div>
</template>

<style scoped>
.badge-moment { position: absolute; inset: 0; z-index: 2; display: grid; align-content: center; justify-items: center; padding: 12px; background: rgb(33 17 33 / 36%); }
.badge-moment > .badge-earned__plate { width: min(100%, 250px); padding-bottom: 1.35rem; }
.badge-moment :deep(.badge-earned__name) { font-size: 1.4rem; }
.badge-moment :deep(.celebration-seal) { --seal-size: 3rem; margin-top: -1.45rem; }
.badge-moment :deep(.badge-earned__date) { margin-top: .2rem; }
.album { align-content: start; justify-items: start; gap: 12px; padding: 18px; background: var(--md-surface); color: var(--md-on-surface); }
.album > strong { font-size: 20px; }
.album > .badge-earned__plate { width: min(48%, 155px); }
.album :deep(.badge-earned__name) { font-size: 1rem; }
.album :deep(.celebration-seal) { --seal-size: 2.25rem; margin-top: -1.15rem; }
:global(.is-still .badge-moment),
:global(.is-still .badge-moment .celebration-seal),
:global(.is-still .badge-moment .badge-earned__art),
:global(.is-still .badge-moment .badge-edition),
:global(.is-still .badge-moment .badge-earned__name),
:global(.is-still .badge-moment .badge-earned__date) { animation: none; }
@media (prefers-reduced-motion: no-preference) {
  .badge-moment:not(.album) { animation: moment-dim 850ms ease-out both; }
}
@keyframes moment-dim { from { background-color: transparent; } to { background-color: rgb(33 17 33 / 36%); } }
:global(.is-still .badge-moment .confetti) { display: none; }
</style>
