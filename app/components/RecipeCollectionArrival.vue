<script setup lang="ts">
import type { RecipeCollectionArrival } from '~/composables/useRecipeCollectionArrival'
import { useMediaQuery } from '@vueuse/core'

const props = defineProps<{ receipt: RecipeCollectionArrival }>()
const emit = defineEmits<{ finish: [] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const card = useTemplateRef<HTMLElement>('card')
const cover = useTemplateRef<HTMLImageElement>('cover')
const veil = useTemplateRef<HTMLElement>('veil')
const flyer = useTemplateRef<HTMLImageElement>('flyer')
const titleId = useId()
const route = useRoute()
const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
const presented = ref(false)
const closing = ref(false)
let introTimer: ReturnType<typeof setTimeout>
let expiry: ReturnType<typeof setTimeout>
const animations: Animation[] = []

onMounted(() => {
  dialog.value?.showModal()
  introTimer = setTimeout(() => {
    presented.value = true
  }, 850)
  // Eine langsame Navigation darf die Bedienung nicht dauerhaft verdecken.
  expiry = setTimeout(() => emit('finish'), 5000)
})

watch(() => route.path, (next, previous) => {
  if (next !== previous && next !== '/app/recipes/' + props.receipt.recipeId) emit('finish')
})

watchEffect(async () => {
  if (!props.receipt.ready || closing.value || (!reduce.value && !presented.value)) return
  closing.value = true
  try {
    if (reduce.value || !cover.value || !card.value || !veil.value || !flyer.value || !cover.value.animate) return
    const destination = Array.from(document.querySelectorAll<HTMLElement>('[data-arrival-cover]')).find((image) => {
      const rect = image.getBoundingClientRect()
      return rect.width > 0 && rect.top < window.innerHeight && rect.bottom > 0
    })
    const from = cover.value.getBoundingClientRect()
    const to = destination?.getBoundingClientRect()
    const duration = to ? 420 : 180
    const timing: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(.22,.74,.22,1)', fill: 'forwards' }
    if (to && from.width && from.height) {
      Object.assign(flyer.value.style, { display: 'block', left: from.x + 'px', top: from.y + 'px', width: from.width + 'px', height: from.height + 'px' })
      cover.value.style.visibility = 'hidden'
      animations.push(flyer.value.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${to.x - from.x}px,${to.y - from.y}px)`, width: to.width + 'px', height: to.height + 'px', opacity: 1, offset: 0.88 },
        { transform: `translate(${to.x - from.x}px,${to.y - from.y}px)`, width: to.width + 'px', height: to.height + 'px', opacity: 0 },
      ], timing))
    }
    animations.push(card.value.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, duration: 160 }))
    animations.push(veil.value.animate([{ opacity: 1 }, { opacity: 0 }], timing))
    await Promise.allSettled(animations.map(animation => animation.finished))
  }
  finally {
    if (dialog.value?.isConnected) emit('finish')
  }
})

onBeforeUnmount(() => {
  clearTimeout(introTimer)
  clearTimeout(expiry)
  dialog.value?.close()
  for (const animation of animations) animation.cancel()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="arrival"
    :aria-labelledby="titleId"
    @cancel="emit('finish')"
  >
    <div
      ref="veil"
      class="veil"
    />
    <div
      ref="card"
      class="card"
    >
      <div class="cover">
        <img
          ref="cover"
          :src="receipt.image"
          alt=""
        >
        <span class="bookmark"><UIcon
          name="i-lucide-bookmark-check"
          mode="svg"
        /></span>
      </div>
      <p class="eyebrow">
        {{ receipt.created ? 'Frisch in deiner Sammlung' : 'Aus deiner Sammlung' }}
      </p>
      <h2 :id="titleId">
        {{ receipt.title }}
      </h2>
      <p class="count">
        {{ receipt.ingredientCount }} {{ receipt.ingredientCount === 1 ? 'Zutat' : 'Zutaten' }}
      </p>
      <ul
        v-if="receipt.ingredients.length"
        aria-hidden="true"
      >
        <li
          v-for="(name, index) in receipt.ingredients"
          :key="index"
          :style="{ '--i': index }"
        >
          <UIcon
            name="i-lucide-check"
            mode="svg"
          /><span>{{ name }}</span>
        </li>
      </ul>
      <button
        type="button"
        @click="emit('finish')"
      >
        Animation überspringen
      </button>
    </div>
    <img
      ref="flyer"
      class="flyer"
      :src="receipt.image"
      alt=""
    >
  </dialog>
</template>

<style scoped>
.arrival { position: fixed; inset: 0; margin: 0; width: 100%; height: 100%; max-width: none; max-height: none; border: 0; padding: 16px; background: transparent; color: var(--md-on-surface); overflow-y: auto; }
.arrival[open] { display: grid; place-items: safe center; }
.arrival::backdrop { background: transparent; }
.veil { position: fixed; inset: 0; background: color-mix(in srgb, var(--md-surface) 93%, transparent); }
.card { position: relative; width: min(100%, 340px); padding: 12px 12px 8px; border: 1px solid var(--md-outline-variant); border-radius: 24px; background: var(--md-surface); box-shadow: 0 18px 60px -28px #53364982; text-align: center; }
.cover { position: relative; }
.cover img, .flyer { display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover; border-radius: 15px; }
.flyer { display: none; position: fixed; pointer-events: none; }
.bookmark { position: absolute; right: 14px; top: 0; display: grid; place-items: center; width: 36px; height: 44px; padding-bottom: 6px; background: var(--md-primary); color: var(--md-on-primary); clip-path: polygon(0 0,100% 0,100% 100%,50% 83%,0 100%); }
.eyebrow { margin-top: 16px; font-size: .88rem; color: var(--md-primary); font-weight: 700; }
h2 { margin: 2px 5px; font-size: 1.75rem; line-height: 1.12; overflow-wrap: anywhere; }
.count { font-size: 1rem; color: var(--md-on-surface-variant); }
ul { margin: 10px 8px 4px; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
li { display: flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 10px; background: var(--md-surface-container); text-align: left; }
li svg { flex: none; color: var(--md-primary); }
li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
button { min-height: 44px; padding-inline: 12px; color: var(--md-on-surface-variant); font-size: .9rem; }
@media (prefers-reduced-motion: no-preference) {
  .card { animation: unfold 300ms ease-out backwards; }
  li { animation: gather 360ms cubic-bezier(.22,.8,.2,1) calc(90ms + var(--i) * 95ms) backwards; }
  .bookmark { animation: tuck 330ms ease-out 260ms backwards; }
}
@keyframes unfold { from { opacity: 0; transform: translateY(12px) scale(.97); } }
@keyframes gather { from { opacity: 0; transform: translateX(-18px); } }
@keyframes tuck { from { opacity: 0; transform: translateY(-8px); } }
</style>
