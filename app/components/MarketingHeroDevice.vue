<script setup lang="ts">
import { marketingHeroWorlds } from '~/data/marketingHeroWorlds'

import type { List, Recipe } from '#shared/types/domain'

import { marketingPalettes } from '~/utils/marketingPalette'

import { heroDuration, heroMomentTimes, marketingHeroFrame, heroHandoffFrame, HERO_HANDOFF_SWAP, HERO_HANDOFF_DURATION } from '~/utils/marketingHeroTimeline'

const root = ref<HTMLElement>()

const storyId = useId()

const { palette, style, handoff, choose: selectPalette } = useMarketingPalette()

const paused = ref(false)

const reduced = ref(false)

const visible = ref(false)

const pageVisible = ref(true)

const elapsed = ref(0)

const compact = ref(false)

const duration = computed(() => heroDuration(compact.value, palette.value))

const availableMoments = computed(() => heroMomentTimes(compact.value, palette.value))

const frame = computed(() => marketingHeroFrame(elapsed.value, compact.value, palette.value))

const running = computed(() => visible.value && pageVisible.value && !paused.value && !reduced.value)

const clockActive = computed(() => pageVisible.value && !reduced.value && (handoff.value >= 0 || (visible.value && !paused.value)))
const arrival = computed(() => heroHandoffFrame(handoff.value))
let pendingWorld = 0
let worldSwapped = false

const current = computed(() => marketingPalettes[palette.value]!)

const world = computed(() => marketingHeroWorlds[palette.value]!)

let observer: IntersectionObserver | undefined

let raf = 0

let lastTime: number | undefined

let media: MediaQueryList | undefined

let sizeMedia: MediaQueryList | undefined

const base = { createdAt: '2026-11-02T12:00:00.000Z', updatedAt: '2026-11-02T12:00:00.000Z', deletedAt: null, fieldTimestamps: null, secret: false, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null }

const lists = computed<List[]>(() => world.value.lists.map((name, i) => ({ ...base, id: `example-list-${i}`, name, color: current.value.primary, secret: world.value.secret && i === 0 })))

const breakfast = computed<List>(() => ({ ...base, id: 'example-created', name: world.value.created, color: current.value.primary }))

const recipes = computed<Recipe[]>(() => [

  { ...base, id: 'example-world', name: world.value.recipe, color: current.value.primary, imagePath: null },

  { ...base, id: 'example-other', name: world.value.image.includes('lasagne') ? 'Omas Marmorkuchen' : 'Lasagne für alle', color: current.value.primary, imagePath: null },

  { ...base, id: 'example-third', name: world.value.image.includes('pizzabroetchen') ? 'Omas Marmorkuchen' : 'Pizzabrötchen', color: current.value.primary, imagePath: null },

])

const recipeImages = computed(() => [world.value.image, world.value.image.includes('lasagne') ? '/images/recipes/marmorkuchen.webp' : '/images/recipes/lasagne.webp', world.value.image.includes('pizzabroetchen') ? '/images/recipes/marmorkuchen.webp' : '/images/recipes/pizzabroetchen.webp'])

watch(palette, () => {
  elapsed.value = 0
  lastTime = undefined
}, { flush: 'sync' })

const narrative = computed(() => compact.value ? [world.value.name, world.value.recipeNote][frame.value.moment] : world.value.moments[frame.value.moment])
const visibleLists = lists

const visibleRecipes = computed(() => compact.value ? recipes.value.slice(0, 2) : recipes.value)

function beginHandoff(index: number) {
  if (handoff.value >= 0 || index === palette.value) return
  if (reduced.value) {
    selectPalette(index)
    elapsed.value = 0
    return
  }
  pendingWorld = index
  worldSwapped = false
  handoff.value = 0
}

function tick(now: number) {
  if (!clockActive.value) return
  const delta = lastTime === undefined ? 0 : Math.min(now - lastTime, 64)
  if (handoff.value >= 0) {
    handoff.value += delta
    if (!worldSwapped && handoff.value >= HERO_HANDOFF_SWAP) {
      worldSwapped = true
      selectPalette(pendingWorld)
      elapsed.value = 0
    }
    if (handoff.value >= HERO_HANDOFF_DURATION) {
      handoff.value = -1
      elapsed.value = 0
    }
  }
  else {
    const next = elapsed.value + delta
    if (next >= duration.value) {
      elapsed.value = duration.value - 1
      beginHandoff((palette.value + 1) % marketingPalettes.length)
    }
    else elapsed.value = next
  }
  lastTime = now
  raf = requestAnimationFrame(tick)
}

watch(clockActive, (play) => {
  cancelAnimationFrame(raf)
  lastTime = undefined
  if (play) raf = requestAnimationFrame(tick)
})

function choose(index: number) {
  beginHandoff(index)
}

function seek(direction: number) {
  const index = (frame.value.moment + direction + availableMoments.value.length) % availableMoments.value.length

  goToMoment(index)
}

function goToMoment(index: number) {
  if (handoff.value >= 0) return
  paused.value = true
  lastTime = undefined
  elapsed.value = availableMoments.value[index]!
}

function layout() {
  compact.value = sizeMedia?.matches ?? false
  handoff.value = -1
  elapsed.value = 0
  lastTime = undefined
}

function motion() {
  reduced.value = media?.matches ?? false

  if (reduced.value) {
    if (handoff.value >= 0) selectPalette(pendingWorld)
    handoff.value = -1
    elapsed.value = 0
  }
}

function visibility() {
  pageVisible.value = !document.hidden
}

onMounted(() => {
  sizeMedia = matchMedia('(max-width: 1100px)')
  layout()

  sizeMedia.addEventListener('change', layout)

  media = matchMedia('(prefers-reduced-motion: reduce)')
  motion()

  media.addEventListener('change', motion)

  visibility()
  document.addEventListener('visibilitychange', visibility)

  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting
  }, { threshold: 0.15 })

  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  handoff.value = -1
  cancelAnimationFrame(raf)
  observer?.disconnect()
  media?.removeEventListener('change', motion)
  sizeMedia?.removeEventListener('change', layout)
  document.removeEventListener('visibilitychange', visibility)
})
</script>

<template>
  <figure
    id="app-vorschau"
    ref="root"
    class="hero-device"
    :style="style"
    :class="{ 'device-still': !running }"
    :data-handoff="handoff >= 0 ? worldSwapped ? 'enter' : 'leave' : 'idle'"
    :data-world="palette"
    :data-compact="compact"
    :data-moment="frame.moment"
    :data-recording="frame.recording"
    :data-sliding="frame.sliding"
  >
    <div
      class="device-stage"
      :style="{ '--world-opacity': arrival.opacity, '--world-shift': `${arrival.shift}px`, '--world-scale': arrival.scale }"
      aria-hidden="true"
      inert
    >
      <div class="device-backdrop" /><div class="device-ring" /><Transition name="world-bloom">
        <div
          :key="palette"
          class="world-bloom"
        />
      </Transition>

      <div class="device-phone">
        <div class="device-screen">
          <div class="device-status">
            <span>9:41</span><span class="camera-dot" /><div><UIcon name="i-lucide-wifi" /><UIcon name="i-lucide-battery-full" /></div>
          </div>

          <MarketingAppToolbar />

          <div class="hero-pager-viewport">
            <div
              class="hero-pager-track"
              :style="{ transform: `translate3d(${-frame.pager * 50}%,0,0)` }"
            >
              <div class="hero-page hero-page--lists">
                <div class="device-lists">
                  <div
                    v-if="palette !== 0"
                    class="hero-created-slot"
                    :style="{ gridTemplateRows: `${frame.created}fr`, opacity: frame.created }"
                  >
                    <div class="hero-created-content">
                      <ListCard
                        :list="breakfast"
                        :open-count="3"
                      />
                    </div>
                  </div>

                  <ListCard
                    v-for="(list, i) in visibleLists"
                    :key="list.id"
                    :list="list"
                    :open-count="i === 0 ? palette === 0 || palette === 1 && frame.moment < 3 ? 2 : palette === 2 ? 12 : 3 : i === 1 ? 4 : 3"
                    :done-count="palette === 1 && frame.moment === 5 && i === 0 ? 3 : 0"
                    :is-shared="i === 0 && !world.secret && !!world.companion && (palette !== 1 || frame.moment >= 2)"
                  />
                </div>

                <div class="hero-fab-row">
                  <span class="hero-image-fab"><i class="native-image-icon" /></span>

                  <span
                    class="hero-voice-fab"
                    :class="{ recording: frame.recording, processing: frame.processing }"
                  >

                    <span
                      v-if="frame.recording"
                      class="hero-record-timer"
                    ><b>00:0{{ frame.seconds }}</b><i><UIcon name="i-lucide-trash-2" /></i></span>

                    <span
                      v-if="frame.recording"
                      class="hero-wave"
                    ><i
                      v-for="(height, i) in frame.wave"
                      :key="i"
                      :style="{ height: `${height}px` }"
                    /></span>

                    <UIcon
                      v-else-if="frame.processing"
                      name="i-lucide-loader-circle"
                      class="hero-processing"
                      :style="{ transform: `rotate(${frame.t * .3}deg)` }"
                    />

                    <i
                      v-else
                      class="native-voice-icon"
                    />

                  </span>

                  <span class="hero-primary-fab"><UIcon name="i-lucide-plus" />Liste</span>
                </div>
              </div>

              <div class="hero-page hero-page--recipes">
                <div class="hero-recipes">
                  <RecipeCard
                    v-for="(recipe, i) in visibleRecipes"
                    :key="recipe.id"
                    :recipe="recipe"
                    :image-src="recipeImages[i]"
                    :ingredient-count="i === 0 ? 9 : i === 1 ? 7 : 6"
                    :step-count="4"
                    :checked-step-count="0"
                    :has-badge="false"
                  />
                </div>

                <div class="hero-fab-row">
                  <span class="hero-image-fab"><i class="native-image-icon" /></span><span class="hero-voice-fab"><i class="native-voice-icon" /></span><span class="hero-primary-fab"><UIcon name="i-lucide-plus" />Rezept</span>
                </div>
              </div>
            </div>

            <Transition
              name="shared-detail"
              :css="handoff < 0"
            >
              <MarketingHeroSharedEdit
                v-if="frame.detail && palette === 0"
                :frame="frame"
                :world="world"
              />
            </Transition>

            <Transition
              name="shared-detail"
              :css="handoff < 0"
            >
              <MarketingHeroEverydayScene
                v-if="frame.detail && palette > 1"
                :world="world"
                :index="palette"
                :moment="frame.moment"
                :time="frame.t"
              />
            </Transition>

            <Transition
              name="shared-detail"
              :css="handoff < 0"
            >
              <MarketingHeroSharingScene
                v-if="frame.detail && palette === 1"
                :world="world"
                :moment="frame.moment"
                :time="frame.t"
              />
            </Transition>

            <span
              class="hero-swipe-touch"
              :style="{ left: `${frame.swipeX}%`, opacity: frame.swipeOpacity }"
            />
          </div>

          <MarketingListInputBar v-if="frame.detail && palette !== 5 && !(palette === 1 && frame.moment < 3) && !(palette === 4 && frame.moment < 3) && !(palette === 3 && frame.moment < 3)" />
          <MarketingAppBottomBar
            v-else-if="!frame.detail"
            :active="frame.pager > .5 ? 'recipes' : 'lists'"
            :progress="frame.pager"
          />
          <hr
            v-else
            class="native-bottom-divider"
            aria-hidden="true"
          >

          <div class="gesture-bar" />
        </div>
      </div>

      <div
        v-if="!compact"
        class="device-recipe"
        :style="{ '--recipe-retreat': `${frame.pager * -12}px` }"
      >
        <MarketingHeroStoryCard
          :world="world"
          :frame="frame"
          :index="palette"
        />
      </div>

      <div
        v-if="!compact"
        class="device-update"
        :style="{ opacity: arrival.opacity * (frame.synced ? 1 : 1 - frame.voiceNote * .8) }"
      >
        <span class="update-avatar"><template v-if="world.companion">{{ world.companion[0] }}</template><UIcon
          v-else
          :name="world.secret ? 'i-lucide-lock' : 'i-lucide-award'"
        /></span><div><strong>{{ frame.synced ? palette === 0 ? "Sam sieht die drei Ergänzungen." : "Noor sieht: alles besorgt." : palette === 1 && frame.moment >= 3 ? "Noor hat Haferdrink ergänzt." : world.update }}</strong><span>{{ world.name }}</span></div><UIcon name="i-lucide-check-check" />
      </div>
    </div>

    <div
      v-if="compact"
      class="compact-world-photo"
      aria-hidden="true"
    >
      <div><MarketingHeroPhoto :scene="world.scene" /></div><p><small>{{ world.scene.note }}</small><strong>{{ world.scene.title }}</strong></p>
    </div>
    <div class="hero-playback">
      <p
        :id="storyId"
        class="hero-step-description"
        :aria-live="paused ? 'polite' : 'off'"
      >
        {{ narrative }}
      </p><div
        class="hero-steps"
        role="group"
        aria-label="Schritte dieser Geschichte"
      >
        <button
          v-for="(time, index) in availableMoments"
          :key="time"
          type="button"
          :disabled="handoff >= 0"
          :aria-label="`Schritt ${index + 1} von ${availableMoments.length}: ${compact ? index === 0 ? world.name : world.recipeNote : world.moments[index]}`"
          :aria-current="frame.moment === index ? 'step' : undefined"
          :class="{ completed: index < frame.moment }"
          @click="goToMoment(index)"
        >
          <span />
        </button>
      </div><div
        class="hero-transport"
        :data-count="`${frame.moment + 1} / ${availableMoments.length}`"
        :aria-describedby="storyId"
      >
        <button
          type="button"
          :disabled="handoff >= 0"
          aria-label="Vorheriger Hero-Moment"
          @click="seek(-1)"
        >
          <UIcon name="i-lucide-chevron-left" />
        </button><button
          type="button"
          :disabled="reduced"
          :aria-label="paused ? 'Hero-Animation fortsetzen' : 'Hero-Animation pausieren'"
          @click="paused = !paused"
        >
          <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
        </button><button
          type="button"
          :disabled="handoff >= 0"
          aria-label="Nächster Hero-Moment"
          @click="seek(1)"
        >
          <UIcon name="i-lucide-chevron-right" />
        </button>
      </div>
    </div>

    <div class="device-colors">
      <MarketingHeroIconLabel
        :icon="world.icon"
        class="color-label"
      >
        {{ world.name }}
      </MarketingHeroIconLabel><div
        class="color-controls"
        aria-label="Beispielfarbwelt der App"
      >
        <button
          v-for="(color, index) in marketingPalettes"
          :key="color.name"
          type="button"
          :disabled="handoff >= 0"
          :style="{ '--swatch': color.primary }"
          :aria-label="`Farbwelt ${color.name}: ${marketingHeroWorlds[index]!.name}`"
          :aria-pressed="palette === index"
          @click="choose(index)"
        >
          <span class="color-dot" /><UIcon
            v-if="palette === index"
            name="i-lucide-check"
          />
        </button>
      </div>
    </div>

    <figcaption>Beispieldaten</figcaption>
  </figure>
</template>

<style scoped>
.hero-device{scroll-margin-top:105px;width:100%;min-width:0;margin:0;color:var(--md-on-surface)}.device-stage{height:580px;position:relative;isolation:isolate}.device-backdrop{position:absolute;inset:70px -8px 24px 0;border-radius:48% 52% 43% 57% / 57% 42% 58% 43%;background:var(--demo-soft);transition:background 1.3s;transform:rotate(-10deg)}.device-ring{position:absolute;inset:32px 18px 40px 5px;border:1px solid color-mix(in srgb,var(--demo-accent) 16%,transparent);border-radius:50%;rotate:16deg;transition:border-color 1.3s}.device-phone{position:absolute;top:10px;left:50%;width:318px;padding:7px;border-radius:40px;background:linear-gradient(140deg,#fffcff,#e4dae1 55%,#fff);box-shadow:0 25px 60px -25px #422e4c48,0 0 0 1px #422e4c12;transform:translateX(-50%) rotate(3deg)}.device-screen{border-radius:33px;overflow:hidden;background:var(--md-surface);border:1px solid #35233215;transition:background 1.3s}.device-status{height:34px;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;position:relative}.device-status>div{display:flex;gap:5px}.device-status .iconify{width:15px;height:15px}.camera-dot{position:absolute;left:50%;top:12px;width:9px;height:9px;background:#2d2631;border-radius:50%}.device-brand{display:flex;align-items:center;justify-content:space-between;padding:12px 17px;background:var(--md-secondary);color:var(--md-primary);transition:background 1.3s,color 1.3s}.theme-wordmark{display:block;width:119px;height:32px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') center/contain no-repeat;transition:background 1.3s}.device-brand>.iconify{width:23px;height:23px}.device-intro{padding:16px 17px 12px}.device-intro h3{font-size:29px;font-weight:800;line-height:1.05;margin:0}.device-intro>span{display:block;font-size:16px;color:var(--md-on-surface-variant);margin-top:5px}.device-lists{display:grid;gap:12px;padding:0 13px}.device-lists:deep(a){min-height:90px;padding:13px;transition:background-color 1.3s,color 1.3s}.device-lists:deep(.text-\[1\.375rem\]){font-size:22px}.device-new{margin:12px 14px 16px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid color-mix(in srgb,var(--md-primary) 36%,transparent);border-radius:16px;padding:11px;color:var(--demo-accent);font-size:18px;font-weight:700;transition:color 1.3s,border-color 1.3s}.device-new .iconify{width:20px;height:20px}.device-bottom{display:flex;gap:12px;justify-content:center;background:var(--md-surface-container);padding:11px 30px 8px;transition:background 1.3s}.device-bottom>span{display:flex;align-items:center;gap:7px;font-size:15px;padding:6px 12px;border-radius:30px}.device-bottom .selected{background:var(--demo-soft);color:var(--demo-accent);font-weight:700;transition:color 1.3s,background 1.3s}.device-bottom .iconify{width:19px;height:19px}.gesture-bar{width:80px;height:4px;border-radius:3px;margin:9px auto;background:var(--md-on-surface);opacity:.6}.device-recipe{position:absolute;left:-14px;bottom:53px;width:190px;border:5px solid var(--md-surface);border-radius:22px;overflow:hidden;background:var(--md-surface);box-shadow:0 18px 35px -15px #47323a42;transform:rotate(-7deg);transition:background 1.3s,border-color 1.3s;animation:card-drift 7s ease-in-out infinite}.device-recipe>img{width:100%;height:100px;object-fit:cover}.device-recipe>div{padding:10px 12px}.device-recipe span{display:block;font-size:12px;line-height:1.3;color:var(--md-on-surface-variant)}.device-recipe strong{display:block;font-size:22px;line-height:1.1;margin:4px 0 9px}.device-recipe span:last-child{display:flex;align-items:center;gap:4px;color:var(--demo-accent);font-weight:700}.device-update{position:absolute;right:-8px;top:-12px;display:flex;align-items:center;gap:9px;padding:12px 14px;border:1px solid #fff;border-radius:18px;background:var(--md-surface);box-shadow:0 15px 30px -12px #47323a30;transform:rotate(-4deg);animation:card-drift 7s -3s ease-in-out infinite;transition:background 1.3s,color 1.3s}.update-avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);font-size:18px;font-weight:700;transition:background 1.3s,color 1.3s}.device-update strong{display:block;font-size:16px;line-height:1.2}.device-update div>span{display:block;font-size:13px;color:var(--md-on-surface-variant)}.device-update>.iconify{width:20px;height:20px;color:var(--md-primary)}.device-colors{display:flex;align-items:center;flex-direction:column;gap:9px;margin-top:8px}.color-label{font-size:16px;font-weight:700;color:var(--demo-accent);transition:color 1.3s}.color-controls{display:flex;gap:3px;align-items:center}.color-controls button{position:relative;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;cursor:pointer;border:1px solid transparent}.color-controls button>.color-dot{width:25px;height:25px;background:var(--swatch);border-radius:50%}.color-controls button[aria-pressed=true]{border-color:var(--swatch)}.color-controls button>.iconify{position:absolute;width:15px;height:15px;color:white}.color-controls .color-pause{margin-left:5px;border-color:color-mix(in srgb,var(--demo-accent) 15%,transparent)}.color-pause>.iconify{color:var(--demo-accent)!important}.color-pause:disabled{opacity:.5;cursor:default}.color-controls button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:3px}.hero-device figcaption{max-width:360px;margin:10px auto 0;text-align:center;font-size:12px;line-height:1.4;color:#796d76}.device-still *{animation-play-state:paused!important}@keyframes card-drift{50%{translate:0 -7px}}@media(max-width:1100px) and (min-width:821px){.device-update{right:-5px;top:-12px}.device-update div>span{display:none}.device-recipe{left:-8px;width:155px;bottom:35px}.device-phone{width:295px}.device-stage{height:570px}}@media(max-width:820px){.hero-device{max-width:500px;margin:auto}.device-stage{height:570px}.device-update{right:0}.device-recipe{left:0;width:168px}.device-backdrop{inset-inline:0}}@media(max-width:420px){.device-phone{width:278px;top:6px}.device-stage{height:550px}.device-update{display:none}.device-update strong{font-size:14px}.device-update div>span{display:none}.device-recipe{width:148px;left:-1px;bottom:22px}.device-recipe>img{height:76px}.device-recipe strong{font-size:19px}.device-intro{padding-top:18px}.device-lists:deep(.text-\[1\.375rem\]){font-size:20px}.device-colors{margin-top:10px}.hero-device figcaption{padding-inline:10px}}@media(prefers-reduced-motion:reduce){.hero-device :deep(*){animation:none!important;transition:none!important}}

.device-lists{padding-top:15px;gap:10px}.device-lists:deep(a){min-height:78px}.hero-fab-row{display:flex;justify-content:flex-end;gap:10px;margin:18px 14px}.hero-fab-row>span{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:14px;background:var(--md-primary);color:white;font-size:18px;box-shadow:0 3px 7px #33253820}.hero-fab-row>span:first-child{background:var(--md-secondary-container);color:var(--md-on-surface)}.hero-fab-row .iconify{width:22px;height:22px}
</style>

<style scoped>
@media(min-width:1101px){.hero-device .device-phone{left:64%}.hero-device .device-recipe{left:-40px}}
</style>

<style scoped>
/* MainPagerScreen.kt: only the pages move. App header, system bars and navigation stay fixed. */

.device-stage{height:590px}.device-phone{max-width:calc(100% - 12px)}.device-screen{height:548px;display:flex;flex-direction:column}.device-status,.device-screen>.native-toolbar,.device-screen>.native-bottom,.gesture-bar{flex-shrink:0}.hero-pager-viewport{position:relative;flex:1;min-height:0;overflow:hidden}.hero-pager-track{display:flex;width:200%;height:100%;will-change:transform}.hero-page{width:50%;flex:0 0 50%;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}.device-lists,.hero-recipes{display:block;flex:1;min-height:0;overflow:hidden;padding:15px 13px 0}.device-lists:deep(a),.hero-recipes:deep(a){min-height:78px;margin-bottom:10px;padding:13px;border-radius:8px}.hero-created-slot{overflow:hidden}.hero-recipes:deep(.text-\[1\.375rem\]){font-size:22px}.hero-recipes:deep(.text-\[1rem\]){font-size:15px}.hero-recipes:deep(img){display:block}.hero-fab-row{flex-shrink:0;gap:12px;margin:12px 14px}.hero-fab-row>span{height:56px;min-width:56px;padding:0;border-radius:16px;font-size:18px;background:var(--md-secondary-container);color:var(--md-on-surface)}.hero-fab-row>.hero-primary-fab{padding:0 14px;background:var(--md-primary);color:var(--md-on-primary);gap:8px}.hero-fab-row .iconify{width:24px;height:24px}.native-voice-icon,.native-image-icon{display:block;width:24px;height:24px;background:currentColor;mask:url('/images/brand/android-ai-voice.svg') center/contain no-repeat}.native-image-icon{mask-image:url('/images/brand/android-ai-image.svg')}.hero-voice-fab{position:relative;transition:background .18s,color .18s}.hero-fab-row>.hero-voice-fab.recording{background:#EF5350;color:#fff}.hero-record-timer{position:absolute;bottom:calc(100% + 10px);left:50%;translate:-50% 0;display:flex;align-items:center;gap:6px;color:var(--md-on-surface)}.hero-record-timer>b{display:grid;place-items:center;width:56px;height:30px;border-radius:8px;background:var(--md-surface);box-shadow:0 1px 4px #33253820;font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}.hero-record-timer>i{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--md-secondary)}.hero-record-timer>i>.iconify{width:16px;height:16px}.hero-wave{display:flex;align-items:center;justify-content:center;gap:3px;width:24px;height:24px}.hero-wave>i{display:block;width:3px;border-radius:50px;background:currentColor;flex-shrink:0}.hero-swipe-touch{position:absolute;top:48%;width:24px;height:24px;translate:-50% -50%;border-radius:50%;background:var(--md-primary-container);border:1px solid var(--md-primary);box-shadow:0 0 0 7px color-mix(in srgb,var(--md-primary) 8%,transparent);pointer-events:none}.device-recipe{translate:var(--recipe-retreat) 0}.device-recipe>div{padding:0}.hero-recipe-note>img{display:block;width:100%;height:100px;object-fit:cover}.hero-recipe-note>div{padding:10px 12px}.device-recipe>.hero-voice-note{position:absolute;inset:0;padding:15px 13px;display:flex;flex-direction:column;justify-content:center}.hero-voice-note .voice-note-label{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--demo-accent)}.voice-note-label>.iconify{width:15px;height:15px;flex-shrink:0}.hero-voice-note p{font-size:21px;font-weight:700;line-height:1.2;margin:12px 0}.device-recipe .hero-voice-note p>span{display:inline;font:inherit;color:var(--md-on-surface)}.hero-voice-note>small{font-size:11px;line-height:1.35;color:var(--md-on-surface-variant)}.hero-playback{display:flex;align-items:center;justify-content:center;gap:10px;min-height:44px;margin:3px 0 12px}.hero-playback>p{font-size:15px;line-height:1.3;margin:0;max-width:220px;color:var(--demo-accent);font-weight:700}.hero-transport{display:flex;flex-shrink:0;gap:0}.hero-transport>button{display:grid;place-items:center;width:36px;height:40px;border-radius:12px;color:var(--demo-accent);cursor:pointer}.hero-transport>button:nth-child(2){background:var(--demo-soft)}.hero-transport .iconify{width:17px;height:17px}.hero-transport>button:disabled{opacity:.5;cursor:default}.hero-transport>button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:2px}.hero-device figcaption{max-width:390px}.device-colors{margin-top:0}

@media(max-width:1100px) and (min-width:821px){.device-stage{height:590px}.hero-fab-row{gap:8px;margin-inline:10px}.hero-fab-row>.hero-primary-fab{padding-inline:12px}.hero-fab-row>span{min-width:48px;height:48px}.hero-recipe-note>img{height:85px}.hero-voice-note p{font-size:18px}}

@media(max-width:820px){.device-stage{height:590px}}

@media(max-width:420px){.device-stage{height:580px}.device-phone{transform:translateX(-50%) rotate(1.5deg)}.hero-fab-row{gap:8px;margin-inline:10px}.hero-fab-row>span{min-width:48px;height:48px}.hero-fab-row>.hero-primary-fab{font-size:16px;padding-inline:12px;gap:6px}.hero-recipes:deep(.text-\[1\.375rem\]){font-size:20px}.hero-recipes:deep(.text-\[1rem\]){font-size:14px}.hero-recipe-note>img{height:76px}.hero-voice-note p{font-size:17px;margin:9px 0}.device-recipe>.hero-voice-note{padding:12px 9px}.hero-voice-note .voice-note-label{font-size:10px}.hero-playback{gap:5px}.hero-playback>p{font-size:14px;max-width:160px}.hero-transport>button{width:34px}.device-colors{margin-top:0}}

@media(prefers-reduced-motion:reduce){.hero-voice-fab{transition:none}.hero-swipe-touch{display:none}}

@media(max-width:420px){.device-stage{height:710px}.device-recipe{left:50%;bottom:14px;width:250px;max-width:calc(100% - 12px);transform:translateX(-50%) rotate(-3deg)}.hero-recipe-note{display:flex;align-items:center;min-height:112px}.hero-recipe-note>img{width:84px;height:112px;flex-shrink:0}.hero-recipe-note>div{padding:8px}.device-recipe strong{font-size:20px;margin:4px 0 7px}.device-recipe>.hero-voice-note{padding:10px 14px}.hero-voice-note p{font-size:18px;margin:7px 0}.hero-voice-note .voice-note-label{font-size:11px}}
</style>

<style scoped>
/* Keep the phone silhouette at every size; simplify the story before shrinking the UI. */

.device-stage{height:810px}

.device-phone{width:376px;top:34px;left:58%}

.device-screen{height:auto;aspect-ratio:9/18.2}

.device-recipe{left:-4px;bottom:110px}

.device-update{right:0;top:0}

@media(max-width:1100px){

  .device-stage{height:722px}

  .device-phone{width:352px;top:8px;left:50%;transform:translateX(-50%) rotate(1.5deg)}

  .device-recipe,.device-update{display:none}

  .device-backdrop{inset:70px 0 40px}

  .device-ring{inset:35px 10px 45px}

}

@media(max-width:420px){

  .device-stage{height:656px}

  .device-phone{width:320px}

  .hero-playback{justify-content:center}

}

@media(max-width:350px){

  .device-stage{height:580px}

  .device-phone{width:284px}

}
</style>

<style scoped>
.hero-transport>button{width:44px;height:44px}

.hero-playback>.hero-step-description{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}

.color-controls button{width:44px;height:44px}
</style>

<style scoped>
.hero-device { container-type:inline-size; }

.hero-created-slot { display:grid; }

.hero-created-content { min-height:0; overflow:hidden; }

.device-lists :deep(a), .hero-recipes :deep(a) { box-shadow:0 2px 4px #30203016; border:1px solid color-mix(in srgb,var(--md-primary) 12%,transparent); }

.hero-recipes :deep(a) { min-height:112px; }

.update-avatar>.iconify { width:20px; height:20px; }

.device-update { max-width:88%; }

.device-update strong { max-width:245px; }

.hero-device figcaption { color:var(--md-on-surface-variant); }

@container(min-width:600px) { .device-stage { zoom:1.15; } }

@container(min-width:800px) { .device-stage { zoom:1.4; } }
</style>

<style scoped>
/* A stable lower edge lets the story card grow without pushing the phone. */

.device-recipe{width:214px;bottom:110px;animation:none;transform:rotate(-5deg);transition:background 1s,border-color 1s,translate .8s cubic-bezier(.22,1,.36,1)}

.device-recipe>div{padding:0}

.world-bloom{position:absolute;inset:70px 0 40px;border-radius:48% 52% 43% 57%;background:radial-gradient(ellipse at 28% 72%,color-mix(in srgb,var(--demo-accent) 14%,transparent),transparent 65%);pointer-events:none;z-index:-1}

.world-bloom-enter-active{transition:opacity 1.1s,transform 1.5s cubic-bezier(.22,1,.36,1)}.world-bloom-leave-active{transition:opacity .7s,transform 1s}.world-bloom-enter-from{opacity:0;transform:scale(.82) rotate(-12deg)}.world-bloom-leave-to{opacity:0;transform:scale(1.08) rotate(8deg)}

.device-backdrop{transition:background 1.3s,border-radius 1.5s,transform 1.5s}.hero-device[data-world="1"] .device-backdrop,.hero-device[data-world="4"] .device-backdrop{border-radius:54% 46% 55% 45% / 45% 57% 43% 55%;transform:rotate(4deg)}.hero-device[data-world="2"] .device-backdrop,.hero-device[data-world="5"] .device-backdrop{border-radius:43% 57% 48% 52% / 55% 45% 55% 45%;transform:rotate(-3deg)}

@media(prefers-reduced-motion:reduce){.world-bloom{display:none}}
</style>

<style scoped>
.device-still :deep(.story-result>span){animation:none}
.device-still :deep(.delta-flash),.device-still :deep(.delta-flash)::before{animation-play-state:paused!important}
.compact-world-photo{display:flex;align-items:center;gap:14px;width:min(100%,360px);min-height:96px;margin:0 auto 18px;padding:8px;border:1px solid var(--md-outline-variant);border-radius:18px;background:var(--md-surface);text-align:left}
.compact-world-photo>div{flex:0 0 96px;height:72px;overflow:hidden;border-radius:11px}
.compact-world-photo>p{min-width:0;margin:0;padding-right:6px}
.compact-world-photo small{display:block;font-size:12px;line-height:1.4;color:var(--md-on-surface-variant);margin-bottom:5px}
.compact-world-photo strong{display:block;font-size:18px;line-height:1.2;font-weight:700}
</style>

<style scoped>
.shared-detail-enter-active,.shared-detail-leave-active{transition:transform .6s cubic-bezier(.22,1,.36,1),opacity .35s}.shared-detail-enter-from,.shared-detail-leave-to{transform:translateX(30px);opacity:0}
</style>

<style scoped>
.hero-transport{align-items:center;gap:6px}.hero-playback{margin-bottom:16px;flex-direction:column;gap:0}.color-label{min-height:24px}
.hero-steps{display:flex;align-items:center;justify-content:center;max-width:100%;gap:0}
.hero-steps>button{display:grid;place-items:center;width:40px;height:44px;flex:0 1 40px;border:0;border-radius:12px;background:transparent;cursor:pointer;color:var(--demo-accent)}
.hero-steps>button>span{display:block;width:7px;height:7px;border-radius:20px;background:color-mix(in srgb,var(--demo-accent) 26%,var(--md-surface));transition:width .3s cubic-bezier(.22,1,.36,1),background-color .3s,box-shadow .3s}
.hero-steps>button.completed>span{background:color-mix(in srgb,var(--demo-accent) 70%,var(--md-surface))}
.hero-steps>button[aria-current=step]>span{width:24px;background:var(--demo-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--demo-accent) 10%,transparent)}
.hero-steps>button:hover>span{background:var(--demo-accent)}
.hero-steps>button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:-3px}
@media(min-width:421px){.hero-steps>button{width:44px;flex-basis:44px}}
@media(prefers-reduced-motion:reduce){.hero-steps>button>span{transition:none}}
</style>

<style scoped>
.device-phone{translate:0 var(--world-shift,0px);scale:var(--world-scale,1)}
.device-screen,.device-recipe{opacity:var(--world-opacity,1)}
.device-recipe{translate:0 var(--world-shift,0px)}
.hero-device[data-handoff]:not([data-handoff=idle]) .device-update{animation:none}
.hero-steps button:disabled,.color-controls button:disabled,.hero-transport button:disabled{cursor:default}
</style>
