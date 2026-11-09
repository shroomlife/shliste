<script setup lang="ts">
import type { IllustratedStep, RecipeIllustration } from '~~/lib/editorial'

const props = withDefaults(defineProps<{ image: RecipeIllustration, step?: IllustratedStep, gallery?: IllustratedStep[], eager?: boolean, zoom?: boolean }>(), { eager: false, zoom: true })
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const showMarkers = ref(true)
const selectedMarker = ref<number | null>(null)
const activeNumber = ref<number>()
const position = computed(() => props.gallery?.findIndex(item => item.number === activeNumber.value) ?? -1)
const activeStep = computed(() => props.gallery?.[position.value] ?? props.step)
const activeImage = computed(() => activeStep.value?.image ?? props.image)
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')
const sheet = useTemplateRef<HTMLElement>('sheet')
const instruction = useTemplateRef<HTMLElement>('instruction')
const previous = computed(() => props.gallery?.[position.value - 1])
const next = computed(() => position.value >= 0 ? props.gallery?.[position.value + 1] : undefined)
const direction = ref(1)
const zoomUrls = new Map<string, string>()
const zoomSrc = computed(() => {
  if (activeImage.value.src === props.image.src) return src.value
  return zoomUrls.get(activeImage.value.src) ?? activeImage.value.src
})
let navigationRequest = 0
function resetZoom() {
  navigationRequest++
  for (const url of zoomUrls.values()) URL.revokeObjectURL(url)
  zoomUrls.clear()
  activeNumber.value = props.step?.number
}
function open() {
  activeNumber.value = props.step?.number
  showMarkers.value = true
  selectedMarker.value = null
  dialog.value?.showModal()
}
async function move(offset: -1 | 1) {
  const target = offset < 0 ? previous.value : next.value
  if (!target || !dialog.value?.open) return
  const request = ++navigationRequest
  const image = new Image()
  const url = target.image.src
  image.src = zoomUrls.get(url) ?? url
  try {
    await image.decode()
  }
  catch {
    const cached = 'caches' in globalThis ? await caches.match(url).catch(() => undefined) : undefined
    const blob = await cached?.blob().catch(() => undefined)
    if (request !== navigationRequest || !dialog.value?.open) return
    if (blob && !zoomUrls.has(url)) zoomUrls.set(url, URL.createObjectURL(blob))
  }
  if (request !== navigationRequest || !dialog.value?.open) return
  const focused = document.activeElement
  direction.value = offset
  selectedMarker.value = null
  activeNumber.value = target.number
  await nextTick()
  sheet.value?.scrollTo(0, 0)
  instruction.value?.scrollTo(0, 0)
  if (!dialog.value?.contains(document.activeElement) || focused?.closest('[inert]')) closeButton.value?.focus({ preventScroll: true })
}
function leavingFrame(element: Element) {
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}
const failed = ref(false)
const objectUrl = ref<string | null>(null)
const src = computed(() => objectUrl.value ?? props.image.src)
const srcset = computed(() => objectUrl.value ? undefined : `${props.image.src.replace('.webp', '-small.webp')} 600w, ${props.image.src} 1200w`)
watch(() => props.image.src, () => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = null
  failed.value = false
})
async function recover() {
  const requested = props.image.src
  if (!('caches' in globalThis)) {
    failed.value = true
    return
  }
  const response = await caches.match(props.image.src).catch(() => undefined)
  const blob = response && await response.blob()
  if (props.image.src !== requested) return
  if (blob && !objectUrl.value) objectUrl.value = URL.createObjectURL(blob)
  else failed.value = true
}
onBeforeUnmount(() => {
  resetZoom()
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})
</script>

<template>
  <figure class="editorial-image">
    <button
      v-if="!failed && zoom"
      type="button"
      class="editorial-image-open"
      :aria-label="step ? `Schritt ${step.number} vergrößern: ${step.title}` : 'Bild vergrößern'"
      @click="open"
    >
      <img
        :src="src"
        :srcset="srcset"
        sizes="(max-width: 680px) calc(100vw - 40px), (max-width: 1100px) 50vw, 740px"
        :alt="image.alt"
        width="1200"
        height="800"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : 'auto'"
        @error="recover"
      >
      <span
        class="editorial-zoom"
        aria-hidden="true"
      ><UIcon name="i-lucide-expand" /></span>
    </button>
    <img
      v-else-if="!failed"
      :src="src"
      :srcset="srcset"
      sizes="(max-width: 680px) calc(100vw - 40px), 50vw"
      :alt="image.alt"
      width="1200"
      height="800"
      :loading="eager ? 'eager' : 'lazy'"
      @error="recover"
    >
    <div
      v-else
      class="editorial-image-missing"
    >
      <UIcon name="i-lucide-image-off" /><span>Das Bild ist gerade nicht verfügbar. Die Anleitung bleibt vollständig lesbar.</span>
    </div>
    <MarketingAiLabel
      v-if="!failed"
      class="editorial-ai"
    />
    <dialog
      v-if="zoom"
      ref="dialog"
      :aria-label="activeStep ? `Schritt ${activeStep.number}: ${activeStep.title}` : 'Vergrößerte Rezeptillustration'"
      class="editorial-lightbox"
      :class="{ 'has-step-navigation': previous || next }"
      :style="{ '--slide-offset': direction * 9 + 'px' }"
      @keydown.left.prevent.stop="move(-1)"
      @keydown.right.prevent.stop="move(1)"
      @close="resetZoom"
      @click="(event: MouseEvent) => { if (event.target === dialog) dialog?.close() }"
    >
      <button
        ref="closeButton"
        class="editorial-close"
        type="button"
        autofocus
        aria-label="Bild schließen"
        @click="dialog?.close()"
      >
        <UIcon
          name="i-lucide-x"
          mode="svg"
          aria-hidden="true"
        />
      </button>
      <div
        ref="sheet"
        class="zoom-sheet"
      >
        <div class="zoom-toolbar">
          <strong
            aria-live="polite"
            aria-atomic="true"
          >{{ activeStep ? 'Schritt ' + activeStep.number : 'Rezeptbild' }}</strong>
          <button
            v-if="activeImage.markers?.length"
            class="marker-toggle"
            type="button"
            :aria-pressed="showMarkers"
            aria-label="Zutaten im Bild"
            @click="showMarkers = !showMarkers"
          >
            <UIcon
              name="i-lucide-scan-eye"
              mode="svg"
              aria-hidden="true"
            /><span class="badge-text">{{ showMarkers ? 'Zutaten ausblenden' : 'Zutaten zeigen' }}</span>
          </button>
        </div>
        <div class="zoom-layout">
          <div class="zoom-picture">
            <Transition
              name="step-swap"
              @before-leave="leavingFrame"
            >
              <div
                :key="activeStep?.number"
                class="photo-frame"
              >
                <img
                  :src="zoomSrc"
                  :alt="activeImage.alt"
                  width="1200"
                  height="800"
                  loading="lazy"
                >
                <Transition name="marker-fade">
                  <div
                    v-show="showMarkers"
                    class="pin-layer"
                    :inert="!showMarkers"
                  >
                    <button
                      v-for="(marker, i) in activeImage.markers"
                      :key="i"
                      type="button"
                      class="ingredient-pin"
                      :style="{ left: marker.x + '%', top: marker.y + '%' }"
                      :aria-label="marker.label"
                      :aria-pressed="selectedMarker === i"
                      @click="selectedMarker = selectedMarker === i ? null : i"
                    >
                      <span
                        class="pin-dot"
                        aria-hidden="true"
                      >{{ i + 1 }}</span>
                      <Transition name="marker-fade">
                        <span
                          v-if="selectedMarker === i"
                          class="pin-label"
                          aria-hidden="true"
                        ><span class="badge-text">{{ marker.label }}</span></span>
                      </Transition>
                    </button>
                  </div>
                </Transition>
              </div>
            </Transition>
          </div>
          <div
            ref="instruction"
            class="zoom-instruction"
          >
            <div class="copy-stage">
              <Transition
                name="step-swap"
                @before-leave="leavingFrame"
              >
                <div
                  :key="activeStep?.number"
                  class="copy-frame"
                >
                  <template v-if="activeStep">
                    <h2>{{ activeStep.title }}</h2><p>{{ activeStep.instruction }}</p>
                  </template>
                  <Transition name="marker-fade">
                    <ul
                      v-show="showMarkers && activeImage.markers?.length"
                      class="ingredient-key"
                      :inert="!showMarkers"
                      aria-label="Zutaten im Bild"
                    >
                      <li
                        v-for="(marker, i) in activeImage.markers"
                        :key="i"
                      >
                        <button
                          type="button"
                          :aria-pressed="selectedMarker === i"
                          @click="selectedMarker = selectedMarker === i ? null : i"
                        >
                          <b>{{ i + 1 }}</b><span class="badge-text">{{ marker.label }}</span>
                        </button>
                      </li>
                    </ul>
                  </Transition>
                  <small>KI-generierte Illustration</small>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="previous || next"
        class="step-navigation"
        role="group"
        aria-label="Zwischen Schritten wechseln"
      >
        <button
          v-if="previous"
          type="button"
          class="step-arrow previous-step"
          aria-label="Vorheriger Schritt"
          @click="move(-1)"
        >
          <UIcon
            name="i-lucide-chevron-left"
            mode="svg"
          />
        </button>
        <button
          v-if="next"
          type="button"
          class="step-arrow next-step"
          aria-label="Nächster Schritt"
          @click="move(1)"
        >
          <UIcon
            name="i-lucide-chevron-right"
            mode="svg"
          />
        </button>
      </div>
    </dialog>
  </figure>
</template>

<style scoped>
.editorial-image{position:relative;margin:0;container-type:inline-size;border-radius:22px;overflow:hidden;background:var(--md-surface-container,#f1e9de)}
.editorial-image img{display:block;width:100%;height:auto;aspect-ratio:auto 3/2;object-fit:cover}
.editorial-image-open{display:block;width:100%;padding:0;cursor:zoom-in;text-align:left}
.editorial-image-open:focus-visible{outline:3px solid var(--md-primary);outline-offset:-5px}
.editorial-ai{position:absolute;bottom:12px;left:12px;pointer-events:none;font-size:15px}
.editorial-zoom{position:absolute;right:12px;bottom:12px;border-radius:50%;padding:10px;background:#fffaf2ed;color:#493c43;display:flex}
.editorial-image-missing{min-height:180px;display:flex;align-items:center;justify-content:center;padding:32px;gap:16px;color:var(--md-on-surface-variant)}
.editorial-lightbox {
  width: min(1240px, calc(100% - 52px));
  max-width: none;
  max-height: none;
  margin: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-on-surface);
  overflow: visible;
}
.zoom-sheet {
  max-height: calc(100dvh - 60px);
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 22px;
  background: var(--md-surface);
  box-shadow: 0 18px 68px #180d2440;
}
.editorial-lightbox::backdrop {
  background: #1c1529db;
  backdrop-filter: blur(6px);
}
@media (prefers-reduced-motion: no-preference) {
  .editorial-lightbox[open],
  .editorial-lightbox[open]::backdrop {
    animation: zoom-appear 160ms ease-out;
  }
}
@keyframes zoom-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}
.zoom-toolbar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 32px 8px 16px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
}
.zoom-toolbar strong{margin-right:auto;color:var(--md-primary);white-space:nowrap;flex-shrink:0}
.editorial-close,.marker-toggle,.ingredient-key button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;border-radius:99px;color:var(--md-primary);background:var(--md-surface-container);padding:0 12px;font-weight:650}
.editorial-close {
  position: absolute;
  z-index: 4;
  inset: -19px -17px auto auto;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid var(--md-surface);
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  box-shadow: 0 3px 12px #29182b36;
}
.editorial-close :deep(svg) { width: 20px; height: 20px; }
.editorial-close:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
.marker-toggle[aria-pressed=true],.ingredient-key button[aria-pressed=true]{background:var(--md-primary-container);color:var(--md-on-primary-container)}
.zoom-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr);
  align-items: stretch;
}
@media (min-width: 1001px) {
  .editorial-lightbox.has-step-navigation { width: min(1240px, calc(100% - 152px)); }
  .step-arrow { position: absolute; top: 50%; transform: translateY(-50%); }
  .previous-step { right: calc(100% + 12px); }
  .next-step { left: calc(100% + 12px); }
  /* The uncropped picture sets the row height. Longer instructions scroll within it. */
  .zoom-instruction {
    contain: size;
    overflow-y: auto;
    scrollbar-width: thin;
    align-content: safe center;
  }
}
.zoom-picture, .photo-frame, .copy-stage { position: relative; }
.zoom-picture { overflow: hidden; }
.pin-layer { position: absolute; inset: 0; pointer-events: none; }
.pin-layer button { pointer-events: auto; }
.step-arrow {
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  line-height: 1;
  border: 1px solid var(--md-outline-variant);
  border-radius: 50%;
  background: var(--md-surface);
  color: var(--md-primary);
  box-shadow: 0 2px 10px #26152d33;
}
.step-arrow :deep(svg) { display: block; width: 24px; height: 24px; }
@media (width < 1001px) {
  .editorial-lightbox.has-step-navigation[open] {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 60px);
  }
  .has-step-navigation .zoom-sheet { min-height: 0; border-radius: 22px 22px 0 0; }
  .step-navigation {
    flex: none;
    display: flex;
    align-items: center;
    padding: 6px 12px;
    border-top: 1px solid var(--md-outline-variant);
    border-radius: 0 0 22px 22px;
    background: var(--md-surface);
  }
  .next-step { margin-left: auto; }
}
.step-arrow:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px; }
.step-swap-leave-active { position: absolute; inset: 0; pointer-events: none; }
@media (prefers-reduced-motion: no-preference) {
  .step-swap-enter-active, .step-swap-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
  .step-swap-enter-from { opacity: 0; transform: translateX(var(--slide-offset)); }
  .step-swap-leave-to { opacity: 0; transform: translateX(calc(-1 * var(--slide-offset))); }
  .marker-fade-enter-active, .marker-fade-leave-active { transition: opacity 150ms ease; }
  .marker-fade-enter-from, .marker-fade-leave-to { opacity: 0; }
}
.marker-toggle, .ingredient-key button { line-height: 1; }
.marker-toggle svg { width: 18px; height: 18px; flex: none; }
.badge-text { display: block; line-height: 1; transform: translateY(.1em); }
@supports (text-box: trim-both cap alphabetic) {
  .badge-text { text-box: trim-both cap alphabetic; transform: none; }
}

.zoom-picture img{width:100%;height:auto;object-fit:contain}
.zoom-instruction{padding:clamp(18px,2vw,32px)}
.zoom-instruction h2{font-size:clamp(24px,2.5vw,34px);line-height:1.12;font-weight:750;letter-spacing:-.025em}
.zoom-instruction p{margin:12px 0;font-size:18px;line-height:1.5}
.zoom-instruction small{display:block;margin-top:14px;color:var(--md-on-surface-variant)}
.ingredient-pin{position:absolute;transform:translate(-50%,-50%);height:44px;width:44px;display:grid;place-items:center}
.pin-dot,.ingredient-key b{display:grid;place-items:center;border-radius:50%;background:#4b3044;color:white;font:bold 15px/1 system-ui}
.pin-dot{width:28px;height:28px;border:2px solid white;box-shadow:0 1px 8px #28132080}
.ingredient-pin[aria-pressed=true]{z-index:1}.ingredient-pin[aria-pressed=true] .pin-dot{outline:3px solid #fff8}
.pin-label{display:grid;place-items:center;min-height:28px;position:absolute;bottom:100%;border-radius:8px;background:#3a2936;color:white;padding:6px 10px;white-space:nowrap;font-size:15px;pointer-events:none}
.ingredient-key{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;margin:16px 0 0}
.ingredient-key b{width:20px;height:20px;font-size:12px}
@media(max-width:1000px){.zoom-layout{grid-template-columns:minmax(0,1fr)}.zoom-toolbar{padding:6px 30px 6px 12px}.zoom-instruction{padding:20px}.zoom-instruction p{font-size:17px}}
@media print{.editorial-ai,.editorial-zoom{display:none}.editorial-image{break-inside:avoid}.editorial-lightbox{display:none}}
</style>
