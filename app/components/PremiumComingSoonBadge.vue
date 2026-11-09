<script setup lang="ts">
defineProps<{ variant: 'hero' | 'sheet' | 'invite' | 'compact' }>()
</script>

<template>
  <span
    class="premium-badge"
    :class="`premium-badge--${variant}`"
  >
    <span class="premium-badge-group">
      <UIcon
        v-if="variant === 'sheet'"
        name="i-lucide-origami"
        class="premium-badge-icon"
        aria-hidden="true"
      />
      <strong class="premium-badge-text">{{ variant === 'invite' ? 'shliste Premium' : 'Premium' }}</strong>
    </span>
    <span class="premium-badge-group premium-badge-status">
      <span
        v-if="variant !== 'invite'"
        class="premium-badge-dot"
        aria-hidden="true"
      />
      <span class="premium-badge-text">Coming Soon</span>
    </span>
  </span>
</template>

<style scoped>
.premium-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  min-block-size: 2.75rem;
  padding: .625rem 1.125rem;
  border-radius: 999px;
  background: #382432;
  color: #fff3fb;
  font-size: .875rem;
  line-height: 1.25;
}
.premium-badge-group { display: inline-flex; align-items: center; gap: .5rem; white-space: nowrap; }
.premium-badge-text { display: block; transform: translateY(.12em); }
@supports (text-box: trim-both cap alphabetic) {
  .premium-badge-text { text-box: trim-both cap alphabetic; transform: none; }
}
.premium-badge-status { color: #eed9e9; }
.premium-badge-icon, .premium-badge-dot { display: block; flex: none; }
.premium-badge-icon { inline-size: 1.125rem; block-size: 1.125rem; color: #edb4d7; }
.premium-badge-dot { inline-size: .375rem; block-size: .375rem; border-radius: 50%; background: #edb4d7; }
.premium-badge--hero { max-inline-size: 19rem; }
.premium-badge--sheet { min-block-size: 3.25rem; border: 1px solid #76536e; border-radius: 1rem; }
.premium-badge--hero, .premium-badge--sheet { position: relative; isolation: isolate; overflow: hidden; box-shadow: inset 0 1px 0 #ffffff24; }
.premium-badge--invite { inline-size: fit-content; padding: 0; min-block-size: 0; font-size: .75rem; }
.premium-badge--invite .premium-badge-status { min-block-size: 1.75rem; padding: .25rem .65rem; border: 1px solid #e7b6d54d; border-radius: 999px; }
.premium-badge--compact { justify-content: center; gap: .375rem; min-block-size: 2rem; padding: .35rem .65rem; border: 1px solid #624455; border-radius: .65rem; font-size: .6875rem; }
.premium-badge--compact .premium-badge-status { gap: .375rem; }
.premium-badge--compact .premium-badge-dot { inline-size: .25rem; block-size: .25rem; }
@media (prefers-reduced-motion: no-preference) {
  .premium-badge--hero::after, .premium-badge--sheet::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 25%, #ffffff18 48%, transparent 70%);
    transform: translateX(-120%);
    animation: premium-badge-glint 1.5s .2s ease-out both;
  }
  @keyframes premium-badge-glint { to { transform: translateX(120%); } }
}
</style>
