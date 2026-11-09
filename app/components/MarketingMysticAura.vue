<script setup lang="ts">
defineProps<{ dark?: boolean }>()
const root = useTemplateRef<HTMLElement>('root')
const visible = ref(false)
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
let frame = 0
let listening = false
function paint() {
  frame = 0
  const element = root.value
  if (!element) return
  const bounds = element.getBoundingClientRect()
  const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)))
  element.style.setProperty('--aura-drift', `${(progress - 0.5) * 70}px`)
}
function scroll() {
  if (!frame) frame = requestAnimationFrame(paint)
}
function sync() {
  const active = visible.value && !media?.matches && !document.hidden
  if (active && !listening) {
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', scroll, { passive: true })
    listening = true
    scroll()
  }
  else if (!active) {
    window.removeEventListener('scroll', scroll)
    window.removeEventListener('resize', scroll)
    cancelAnimationFrame(frame)
    frame = 0
    listening = false
    root.value?.style.removeProperty('--aura-drift')
  }
}
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting
    sync()
  })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => {
  visible.value = false
  sync()
  observer?.disconnect()
  media?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <div
    ref="root"
    class="mystic-aura"
    :class="{ 'mystic-aura--dark': dark, 'is-visible': visible }"
    aria-hidden="true"
  >
    <div class="aura-depth">
      <span class="aura-veil aura-veil--rose" /><span class="aura-veil aura-veil--lilac" /><span class="aura-orbit" /><i
        v-for="n in 7"
        :key="n"
        class="aura-spark"
        :style="{ '--n': n }"
      />
    </div>
  </div>
</template>

<style scoped>
.mystic-aura{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:0;--aura-rose:#d78fbe33;--aura-lilac:#a79be82b;--aura-line:#b26a9b20;--aura-spark:#a75c92;--aura-drift:0px}
.mystic-aura--dark{--aura-rose:#df9cc32b;--aura-lilac:#b5a0e726;--aura-line:#eacbe526;--aura-spark:#ffe9f8}
.aura-depth{position:absolute;inset:-45px 0;transform:translateY(var(--aura-drift));transition:transform .16s linear}
.aura-veil{position:absolute;display:block;pointer-events:none;border-radius:50%;width:min(70vw,52rem);height:34rem;background:radial-gradient(ellipse,var(--aura-rose),transparent 68%);top:0;right:-15%;transform:rotate(-25deg)}
.aura-veil--lilac{background:radial-gradient(ellipse,var(--aura-lilac),transparent 68%);top:32%;right:auto;left:-22%;height:28rem}
.aura-orbit{position:absolute;display:block;top:10%;right:-10rem;width:36rem;height:36rem;border:1px solid var(--aura-line);border-radius:50%;transform:rotate(-22deg) scaleY(.6)}
.aura-spark{position:absolute;display:block;left:calc(6% + var(--n) * 12%);top:calc(8% + var(--n) * 11%);width:3px;height:3px;border-radius:50%;background:var(--aura-spark);opacity:.35;box-shadow:0 0 10px 2px var(--aura-line)}
.aura-spark:nth-of-type(even){width:2px;height:2px;opacity:.22}
@media(prefers-reduced-motion:no-preference){.is-visible .aura-veil{animation:aura-arrive 3.6s ease-out both}.is-visible .aura-veil--lilac{animation-delay:.15s}.is-visible .aura-spark{animation:spark-arrive 2.4s ease-out both;animation-delay:calc(var(--n) * .12s)}}
@keyframes aura-arrive{from{opacity:0;transform:translateY(18px) rotate(-25deg) scale(.96)}to{opacity:1;transform:translateY(0) rotate(-25deg) scale(1)}}
@keyframes spark-arrive{from{opacity:0;transform:translateY(10px)}to{opacity:.35;transform:translateY(0)}}
@media(max-width:639px){.aura-veil{width:110vw;height:24rem}.aura-orbit{width:24rem;height:24rem;right:-15rem}.aura-spark:nth-of-type(even){display:none}}
@media(prefers-reduced-motion:reduce){.aura-depth{transform:none;transition:none}}
@media print{.mystic-aura{display:none}}
</style>
