<script setup lang="ts">
const props = withDefaults(defineProps<{ theme: 'baking' | 'raclette', poster: string, alt: string, to?: string, eager?: boolean }>(), { eager: false })
const root = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const { active, reduced, paused, toggle } = useThemeMotion(root)
const requested = ref(false)
const ready = ref(false)
const failed = ref(false)
const NuxtLink = resolveComponent('NuxtLink')
async function syncPlayback() {
  if (!active.value || failed.value) {
    video.value?.pause()
    return
  }
  requested.value = true
  await nextTick()
  if (!active.value || !video.value) return
  video.value.muted = true
  try {
    await video.value.play()
    if (!active.value) video.value?.pause()
  }
  catch {
    // Autoplay may be denied or interrupted by a quick scroll. Keep the poster.
    if (active.value) ready.value = false
  }
}
watch(active, syncPlayback)
onBeforeUnmount(() => video.value?.pause())
</script>

<template>
  <span
    ref="root"
    class="theme-motion"
    :data-theme="theme"
    :data-motion-active="active && !failed"
  >
    <component
      :is="to ? NuxtLink : 'span'"
      :to="to"
      class="theme-motion-picture"
    >
      <img
        :src="poster"
        :alt="alt"
        width="1536"
        height="1024"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : 'auto'"
      >
      <video
        v-if="requested && !failed"
        ref="video"
        :src="`/images/theme-loops/${props.theme}.mp4`"
        class="theme-motion-video"
        :class="{ 'is-ready': ready && !reduced }"
        muted
        loop
        playsinline
        preload="none"
        aria-hidden="true"
        tabindex="-1"
        @playing="ready = true"
        @error="failed = true"
      />
    </component>
    <button
      v-if="!reduced && !failed"
      type="button"
      class="theme-motion-toggle"
      :aria-label="paused ? 'Animationen fortsetzen' : 'Animationen pausieren'"
      :title="paused ? 'Animationen fortsetzen' : 'Animationen pausieren'"
      :aria-pressed="paused"
      @click.stop.prevent="toggle"
    ><UIcon :name="paused ? 'i-lucide-play' : 'i-lucide-pause'" /></button>
  </span>
</template>

<style scoped>
.theme-motion{display:block;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;border-radius:inherit;aspect-ratio:3/2}.theme-motion-picture{display:block;width:100%;height:100%;position:relative}.theme-motion img,.theme-motion-video{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit}.theme-motion-video{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity 180ms ease}.theme-motion-video.is-ready{opacity:1}.theme-motion-toggle{position:absolute;z-index:2;left:12px;bottom:12px;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid #ffffff70;background:color-mix(in srgb,var(--md-surface) 92%,transparent);color:var(--demo-accent);cursor:pointer;box-shadow:0 2px 12px #00000010}.theme-motion-toggle .iconify{width:20px;height:20px}.theme-motion-toggle:focus-visible,.theme-motion-picture:focus-visible{outline:3px solid var(--demo-accent);outline-offset:-4px}@media(prefers-reduced-motion:reduce){.theme-motion-video{display:none;transition:none}}
</style>
