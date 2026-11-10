<script setup lang="ts">
import { useDocumentVisibility, useMediaQuery } from '@vueuse/core'

const artwork = useTemplateRef<HTMLElement>('artwork')
const hovered = ref(false)
const keyboardFocused = ref(false)
const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()
const engaged = computed(() => (hovered.value && finePointer.value) || keyboardFocused.value)
const moving = computed(() => engaged.value && !reducedMotion.value && visibility.value === 'visible')

// A single, shared rhythm for the list, arrow and light. Nothing animates at rest.
const duration = 2800
const easing = 'cubic-bezier(.22,.8,.3,1)'
type Track = { selector: string, property: 'strokeDashoffset' | 'opacity' | 'transform', rest: string, frames: Keyframe[] }
const tracks: Track[] = [
  { selector: '.cta-check--first', property: 'strokeDashoffset', rest: '0', frames: [
    { strokeDashoffset: 0, offset: 0 }, { strokeDashoffset: 0, offset: 0.08 },
    { strokeDashoffset: 1, offset: 0.17 }, { strokeDashoffset: 0, offset: 0.32 }, { strokeDashoffset: 0, offset: 1 },
  ] },
  { selector: '.cta-check--second', property: 'strokeDashoffset', rest: '0', frames: [
    { strokeDashoffset: 0, offset: 0 }, { strokeDashoffset: 0, offset: 0.21 },
    { strokeDashoffset: 1, offset: 0.30 }, { strokeDashoffset: 0, offset: 0.45 }, { strokeDashoffset: 0, offset: 1 },
  ] },
  { selector: '.cta-lines', property: 'opacity', rest: '.72', frames: [
    { opacity: 0.72, offset: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.58 }, { opacity: 0.72, offset: 0.8 }, { opacity: 0.72, offset: 1 },
  ] },
  { selector: '.cta-arrow', property: 'transform', rest: 'translateX(0px)', frames: [
    { transform: 'translateX(0px)', offset: 0 }, { transform: 'translateX(0px)', offset: 0.3 },
    { transform: 'translateX(2px)', offset: 0.48 }, { transform: 'translateX(0px)', offset: 0.7 }, { transform: 'translateX(0px)', offset: 1 },
  ] },
  { selector: '.app-cta-glint', property: 'transform', rest: 'translateX(-110%)', frames: [
    { transform: 'translateX(-110%)', offset: 0 }, { transform: 'translateX(110%)', offset: 0.55 },
    { transform: 'translateX(110%)', offset: 0.99 }, { transform: 'translateX(-110%)', offset: 1 },
  ] },
  { selector: '.app-cta-glint', property: 'opacity', rest: '0', frames: [
    { opacity: 0, offset: 0 }, { opacity: 0.28, offset: 0.2 }, { opacity: 0, offset: 0.55 }, { opacity: 0, offset: 1 },
  ] },
]
let animations: Animation[] = []
function cancelAnimations() {
  animations.forEach(animation => animation.cancel())
  animations = []
}
function transitionMotion(play: boolean) {
  const root = artwork.value?.closest('a')
  if (!root) return
  const elements = tracks.map((track) => {
    const element = root.querySelector<HTMLElement | SVGElement>(track.selector)
    return { track, element, current: element ? getComputedStyle(element)[track.property] : track.rest }
  })
  // Read the current frame BEFORE cancelling, including an interrupted return.
  cancelAnimations()
  if (reducedMotion.value || visibility.value !== 'visible') return
  for (const { track, element, current } of elements) {
    if (!element?.animate) continue
    const frames = play
      ? [{ ...track.frames[0], [track.property]: current }, ...track.frames.slice(1)]
      : [{ [track.property]: current }, { [track.property]: track.rest }]
    animations.push(element.animate(frames.map(frame => ({ ...frame, easing })), { duration: play ? duration : 180, iterations: play ? Infinity : 1, easing: 'linear', fill: play ? 'both' : 'none' }))
  }
}
watch(moving, transitionMotion)
watch([reducedMotion, visibility], () => {
  if (reducedMotion.value || visibility.value !== 'visible') cancelAnimations()
})
onBeforeUnmount(cancelAnimations)
function focus(event: FocusEvent) {
  keyboardFocused.value = (event.target as Element).matches(':focus-visible')
}
</script>

<template>
  <NuxtLink
    to="/app/lists"
    class="app-cta"
    data-analytics-event="open_app"
    data-analytics-location="header"
    :class="{ 'is-engaged': engaged }"
    @pointerenter="hovered = $event.pointerType === 'mouse'"
    @pointerleave="hovered = false"
    @pointercancel="hovered = false"
    @focus="focus"
    @blur="keyboardFocused = false"
  >
    <span
      class="app-cta-glint"
      aria-hidden="true"
    />
    <span
      ref="artwork"
      class="app-cta-art"
      aria-hidden="true"
    >
      <svg
        class="cta-window"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        focusable="false"
      >
        <rect
          class="cta-window-frame"
          x="3.5"
          y="3.5"
          width="25"
          height="25"
          rx="6"
          stroke-width="1.65"
        />
        <path
          class="cta-window-bar"
          d="M4.25 10.5h23.5"
          stroke-width="1.3"
        />
        <path
          class="cta-check cta-check--first"
          d="m7.5 17 1.75 1.75 3.25-3.5"
          pathLength="1"
          stroke-width="1.8"
        />
        <path
          class="cta-check cta-check--second"
          d="m7.5 23 1.75 1.75 3.25-3.5"
          pathLength="1"
          stroke-width="1.8"
        />
        <g
          class="cta-lines"
          stroke-width="1.65"
        ><path d="M16.5 17h7" /><path d="M16.5 23h7" /></g>
      </svg>
    </span>
    <span class="app-cta-label optical-center">Zur App</span>
    <span
      class="app-cta-direction"
      aria-hidden="true"
    >
      <svg
        class="cta-arrow"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.65"
        stroke-linecap="round"
        stroke-linejoin="round"
        focusable="false"
      ><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
    </span>
  </NuxtLink>
</template>

<style scoped>
.app-cta {
  --cta-color: var(--demo-accent, #a6387d);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 50px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--cta-color) 94%, white);
  border-radius: 16px;
  background: var(--cta-color);
  color: white;
  box-shadow: inset 0 1px 0 #ffffff2e, inset 0 -1px 0 #180c2810, 0 2px 5px -2px #30203026;
  text-decoration: none;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 400ms ease, border-color 400ms ease, box-shadow 200ms ease;
}
.app-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(165deg, #ffffff14, transparent 52%, #180c2812);
  opacity: .7;
  transition: opacity 180ms ease;
}
.app-cta.is-engaged::before { opacity: 1; }
.app-cta.is-engaged { box-shadow: inset 0 1px 0 #ffffff38, inset 0 -1px 0 #180c2810, 0 4px 12px -5px color-mix(in srgb, var(--cta-color) 48%, transparent); }
.app-cta:focus-visible { outline: 2px solid var(--cta-color); outline-offset: 4px; }
.app-cta:active { box-shadow: inset 0 2px 5px #180c2824; }
.app-cta > span { pointer-events: none; }
.app-cta-glint { position: absolute; inset: 0; z-index: 1; opacity: 0; transform: translateX(-110%); background: linear-gradient(110deg, transparent 15%, #ffffff2e 48%, #ffffff40 51%, transparent 85%); }
.app-cta-art { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; }
.cta-window { display: block; width: 28px; height: 28px; }
.cta-window-frame { fill: #ffffff0c; stroke-opacity: .9; }
.cta-window-bar { stroke-opacity: .55; }
.cta-check { stroke-dasharray: 1; stroke-dashoffset: 0; }
.cta-lines { opacity: .72; }
.app-cta-label { display: block; font-size: 18px; font-weight: 700; line-height: 1.05; }
.app-cta-direction { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; }
.cta-arrow { display: block; width: 22px; height: 22px; transform: translateX(0px); }
@media (max-width: 1023px) {
  .app-cta { min-height: 46px; padding: 7px 12px; gap: 9px; border-radius: 14px; }
  .app-cta-art, .cta-window { width: 28px; height: 28px; }
  .app-cta-art { flex-basis: 28px; }
  .app-cta-label { font-size: 17px; }
  .app-cta-direction { display: none; }
}
@media (max-width: 380px) {
  .app-cta { min-height: 44px; padding: 7px 10px; gap: 7px; border-radius: 13px; }
  .app-cta-art, .cta-window { width: 25px; height: 25px; }
  .app-cta-art { flex-basis: 25px; }
  .app-cta-label { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .app-cta, .app-cta::before { transition: none; }
}
</style>
