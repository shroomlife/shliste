<script setup lang="ts">
defineProps<{ placement: 'rail' | 'bottom' }>()
</script>

<template>
  <NuxtLink
    v-if="placement === 'rail'"
    to="/?view=website"
    class="state-layer flex size-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
    style="color: var(--md-primary)"
    aria-label="Website entdecken"
    title="Website entdecken"
  >
    <UIcon
      name="i-lucide-compass"
      class="size-6"
      aria-hidden="true"
    />
  </NuxtLink>
  <NuxtLink
    v-else
    to="/?view=website"
    class="app-website"
    :class="`app-website--${placement}`"
    aria-label="Website entdecken"
    title="Website entdecken: Ideen, Beispiele und Hilfe"
  >
    <span
      class="website-symbol"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-compass"
        class="website-compass"
      />
      <UIcon
        name="i-lucide-arrow-up-right"
        class="website-arrow"
      />
    </span>
    <span class="website-label">Website</span>
  </NuxtLink>
</template>

<style scoped>
.app-website {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .25rem;
  min-width: 0;
  min-height: 44px;
  border-radius: 1rem;
  color: var(--md-primary);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.website-symbol {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--md-primary) 20%, transparent);
  background: linear-gradient(145deg, var(--md-surface), var(--md-primary-container));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--md-surface) 70%, transparent);
  transition: border-color 180ms, box-shadow 180ms;
}
.website-compass {
  width: 1.5rem;
  height: 1.5rem;
  transition: transform 220ms cubic-bezier(.2, .8, .2, 1);
}
.website-arrow {
  position: absolute;
  top: .2rem;
  right: .2rem;
  width: .65rem;
  height: .65rem;
}
.website-label { font-size: .875rem; line-height: 1.3; font-weight: 600; }
.app-website--bottom { flex: 1 1 0; padding-block: .5rem; }
.app-website--bottom .website-symbol { width: 4rem; height: 3rem; border-radius: 1.5rem; }
.app-website--bottom .website-compass { width: 1.75rem; height: 1.75rem; }
.app-website--bottom .website-arrow { top: .4rem; right: .65rem; width: .75rem; height: .75rem; }
.app-website:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
@media (hover: hover) {
  .app-website:hover .website-compass { transform: rotate(-15deg); }
  .app-website:hover .website-symbol { border-color: var(--md-primary); box-shadow: 0 4px 12px -7px var(--md-primary); }
}
@media (prefers-reduced-motion: reduce) {
  .website-symbol, .website-compass { transition: none; }
  .app-website:hover .website-compass { transform: none; }
}
</style>
