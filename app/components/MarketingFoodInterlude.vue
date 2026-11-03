<script setup lang="ts">
const props = defineProps<{
  motif: 'tomatoes' | 'lasagne' | 'cake'
}>()
const pictures = {
  tomatoes: { file: 'tomaten-basilikum', alt: 'Reife Tomaten und Basilikum in einer blauen Keramikschale auf hellem Stein, daneben roséfarbenes Leinen.', eyebrow: 'Ein Blick in die Küche', title: 'Was machen wir aus den Tomaten?', text: 'Schau nach, was schon da ist. Nur die fehlenden Zutaten kommen auf deinen Einkauf.', to: '/anleitungen/zutaten-auf-einkaufsliste', link: 'Zutaten auf die Liste übernehmen', icon: 'i-lucide-shopping-basket', note: 'Fürs Abendessen', detail: 'Tomaten · Basilikum' },
  lasagne: { file: 'lasagne-abend', alt: 'Ein Stück goldbraune Gemüselasagne auf einem handgemachten blauen Teller im warmen Abendlicht.', eyebrow: 'Freitag kommen Freunde', title: 'Heute gibt’s Lasagne.', text: 'Die Zutaten sind besorgt. Jetzt ist Zeit zum Schichten, Backen und Zusammensitzen.', to: '/im-alltag/gaeste-zum-essen', link: 'Den Abend gemeinsam planen', icon: 'i-lucide-chef-hat', note: 'Auf dem Plan', detail: 'Lasagne für Freitag' },
  cake: { file: 'marmorkuchen-pause', alt: 'Angeschnittener Marmorkuchen mit sichtbarer Schokoladenmarmorierung auf blauer Keramik, dazu eine Tasse Kaffee.', eyebrow: 'Den backen wir wieder', title: 'Noch ein Stück für später.', text: 'Omas Marmorkuchen schmeckt auch morgen. Ihr Rezept findest du beim nächsten Backen in deiner Sammlung.', to: '/anleitungen/rezept-aus-foto', link: 'Omas Rezept behalten', icon: 'i-lucide-notebook-pen', note: 'Lieblingsrezept', detail: 'Omas Marmorkuchen' },
} as const
const picture = computed(() => pictures[props.motif])
const root = ref<HTMLElement>()
const offset = ref(0)
const canMove = ref(false)
const paused = ref(false)
const headingId = useId()
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
let frame = 0
let visible = false
function update() {
  frame = 0
  if (!root.value || !canMove.value || paused.value || document.hidden || !visible)
    return
  const bounds = root.value.getBoundingClientRect()
  const progress = (window.innerHeight / 2 - (bounds.top + bounds.height / 2)) / ((window.innerHeight + bounds.height) / 2)
  offset.value = Math.max(-28, Math.min(28, progress * 28))
}
function schedule() {
  if (visible && canMove.value && !paused.value && !frame)
    frame = requestAnimationFrame(update)
}
function motionChanged() {
  canMove.value = media?.matches ?? false
  offset.value = 0
  schedule()
}
function toggleMotion() {
  paused.value = !paused.value
  if (paused.value)
    offset.value = 0
  else
    schedule()
}
onMounted(() => {
  media = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)')
  motionChanged()
  media.addEventListener('change', motionChanged)
  observer = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    schedule()
  })
  if (root.value)
    observer.observe(root.value)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  document.addEventListener('visibilitychange', schedule)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  media?.removeEventListener('change', motionChanged)
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  document.removeEventListener('visibilitychange', schedule)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <section
    ref="root"
    class="food-interlude"
    :class="`food-interlude--${motif}`"
    :aria-labelledby="headingId"
    :style="{ '--food-shift': `${offset}px`, '--note-shift': `${offset * -.4}px` }"
  >
    <figure class="food-picture">
      <div class="food-photo">
        <img
          :src="`/images/food/${picture.file}.webp`"
          :srcset="`/images/food/${picture.file}-small.webp 768w, /images/food/${picture.file}.webp 1536w`"
          sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1400px) calc(100vw - 64px), 1280px"
          :alt="picture.alt"
          width="1536"
          height="1024"
          loading="lazy"
          decoding="async"
        >
      </div><figcaption><UIcon name="i-lucide-sparkles" /> KI-generiert</figcaption>
    </figure>
    <div class="food-copy">
      <p class="food-eyebrow">
        {{ picture.eyebrow }}
      </p><h2 :id="headingId">
        {{ picture.title }}
      </h2><p class="food-text">
        {{ picture.text }}
      </p><NuxtLink
        :to="picture.to"
        class="food-link"
      ><UIcon :name="picture.icon" /><span>{{ picture.link }}</span></NuxtLink>
    </div>
    <div
      class="food-keepsake"
      aria-hidden="true"
    >
      <span class="keepsake-icon"><UIcon :name="picture.icon" /></span><span><small>{{ picture.note }}</small><strong>{{ picture.detail }}</strong></span>
    </div>
    <button
      v-if="canMove"
      type="button"
      class="food-motion"
      :aria-pressed="paused"
      @click="toggleMotion"
    >
      <UIcon :name="paused ? 'i-lucide-play' : 'i-lucide-pause'" />{{ paused ? 'Bildbewegung einschalten' : 'Bildbewegung pausieren' }}
    </button>
  </section>
</template>

<style scoped>
.food-interlude{position:relative;isolation:isolate;max-width:var(--marketing-content);width:calc(100% - 2 * var(--marketing-gutter));min-height:530px;margin:50px auto 65px;border-radius:32px;background:#f4ede1;overflow:hidden;color:#352b2a;display:flex;align-items:center}.food-picture{position:absolute;inset:0;margin:0;z-index:0}.food-photo{position:absolute;inset:-36px 0;transform:translate3d(0,var(--food-shift,0px),0)}.food-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:62% 50%}.food-picture::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#f6f0e5 0%,#f6f0e5f5 23%,#f6f0e5bb 36%,#f6f0e515 58%,transparent 72%)}.food-picture figcaption{position:absolute;bottom:18px;right:20px;z-index:2;display:flex;align-items:center;gap:5px;font-size:11px;padding:6px 10px;border-radius:20px;background:#fffaf1eb;color:#514339}.food-picture figcaption>.iconify{width:13px;height:13px}.food-copy{max-width:440px;padding:60px 0 75px 48px;position:relative;z-index:1}.food-eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#775b57;margin-bottom:20px}.food-copy h2{font-size:clamp(2.3rem,4vw,3.5rem);font-weight:900;line-height:1.03;letter-spacing:-.04em;text-wrap:balance}.food-text{font-size:19px;line-height:1.6;margin-top:23px;max-width:340px}.food-link{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:11px 15px;margin-top:23px;border-radius:16px;background:var(--md-surface);color:var(--demo-accent);font-weight:700;font-size:16px;box-shadow:0 6px 20px -14px #523a3a55;transition:box-shadow .25s}.food-link>.iconify{width:21px;height:21px;flex-shrink:0}.food-link:hover{box-shadow:0 8px 25px -12px #523a3a66}.food-keepsake{position:absolute;z-index:1;right:42px;bottom:65px;display:flex;align-items:center;gap:12px;padding:17px 22px;border-radius:21px;background:var(--md-surface);color:var(--md-on-surface);box-shadow:0 14px 38px -16px #3c2c2750;transform:translate3d(0,var(--note-shift,0px),0) rotate(-3deg)}.keepsake-icon{display:grid;place-items:center;width:43px;height:43px;border-radius:14px;background:var(--demo-soft);color:var(--demo-accent)}.keepsake-icon>.iconify{width:22px;height:22px}.food-keepsake small{display:block;font-size:12px;color:var(--demo-accent)}.food-keepsake strong{display:block;font-size:21px;line-height:1.2;margin-top:3px}.food-motion{position:absolute;left:48px;bottom:17px;display:flex;align-items:center;gap:6px;min-height:36px;padding:5px 9px;border-radius:12px;color:#69574e;background:#fffaf1c9;font-size:11px;cursor:pointer}.food-motion>.iconify{width:13px;height:13px}.food-interlude :is(a,button):focus-visible{outline:2px solid var(--demo-accent);outline-offset:4px}
.food-interlude{scroll-margin-top:110px}.food-motion{z-index:2}
@media(max-width:1100px) and (min-width:901px){.food-copy{max-width:385px;padding-left:32px}.food-copy h2{font-size:44px}.food-text{max-width:310px}.food-motion{left:32px}.food-keepsake{right:26px;padding:13px 17px;bottom:58px}.food-keepsake strong{font-size:18px}}
@media(max-width:900px){.food-interlude{display:flex;flex-direction:column;align-items:stretch;width:calc(100% - 2 * var(--marketing-gutter));min-height:0;margin:30px auto 45px;border-radius:25px}.food-picture{position:relative;inset:auto;aspect-ratio:3/2;z-index:0;overflow:hidden}.food-photo{inset:0;transform:none}.food-photo img{object-fit:contain}.food-picture::after{display:none}.food-picture figcaption{bottom:13px;right:13px}.food-copy{order:1;max-width:620px;padding:28px 30px 32px}.food-copy h2{font-size:38px;max-width:450px}.food-eyebrow{margin-bottom:15px}.food-text{font-size:18px;max-width:480px;margin-top:16px}.food-link{font-size:16px;margin-top:19px}.food-keepsake,.food-motion{display:none}}
@media(max-width:420px){.food-copy{padding:24px 22px 27px}.food-copy h2{font-size:32px}.food-link{padding:10px 12px;font-size:15px}.food-eyebrow{font-size:10px}.food-text{font-size:17px}}
@media(prefers-reduced-motion:reduce){.food-photo{transform:none}.food-keepsake{transform:rotate(-3deg)}.food-link{transition:none}.food-motion{display:none}}
</style>
