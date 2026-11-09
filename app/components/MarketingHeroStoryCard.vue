<script setup lang="ts">
import type { marketingHeroWorlds } from '~/data/marketingHeroWorlds'

import type { marketingHeroFrame } from '~/utils/marketingHeroTimeline'

const props = defineProps<{ world: typeof marketingHeroWorlds[number], frame: ReturnType<typeof marketingHeroFrame>, index: number }>()

const { handoff } = useMarketingPalette()

const recipePanel = ref<HTMLElement>()

const voicePanel = ref<HTMLElement>()

const heights = reactive({ recipe: 240, voice: 190 })

const speaking = computed(() => props.frame.voiceNote > 0.5 || (props.index !== 0 && props.frame.detail))

const ready = computed(() => props.frame.created > 0.5)

const shared = computed(() => props.index === 0)

const words = computed(() => props.world.voice.split(' '))

const beats = [

  { label: 'Die Lasagne für euren Abend', result: 'Für euren Tisch', x: -14, y: 0 },

  { label: 'Morgens in eurer Küche', result: 'Morgen ist wieder alles da', x: 0, y: 12 },

  { label: 'Der erste Urlaubsmorgen', result: 'Bereit für den Balkon', x: 14, y: 4 },

  { label: 'Zwischen zwei Kartons', result: 'Euer erster Abend kann kommen', x: -10, y: 10 },

  { label: 'Ein Kuchen. Keine verratene Idee.', result: 'Nur die Zutaten kommen mit', x: 0, y: -12 },

  { label: 'Die Extras für eure Kaffeerunde', result: 'Ein Sonntag wie früher', x: 12, y: -6 },

] as const

const beat = computed(() => beats[props.index]!)

let observer: ResizeObserver | undefined

function measure() {
  if (recipePanel.value) heights.recipe = recipePanel.value.offsetHeight

  if (voicePanel.value) heights.voice = voicePanel.value.offsetHeight
}

onMounted(() => {
  observer = new ResizeObserver(measure)

  if (recipePanel.value) observer.observe(recipePanel.value)

  if (voicePanel.value) observer.observe(voicePanel.value)

  measure()
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    class="story-card"
    :class="{ 'story-card--voice': speaking }"
    :style="{ 'height': `${speaking ? heights.voice : heights.recipe}px`, '--arrival-x': `${beat.x}px`, '--arrival-y': `${beat.y}px` }"
  >
    <div
      ref="recipePanel"
      class="story-panel recipe-panel"
      :class="{ 'panel-hidden': speaking }"
    >
      <Transition
        name="story-world"
        :css="handoff < 0"
      >
        <div
          :key="index"
          class="world-content"
        >
          <div class="story-photo">
            <MarketingHeroPhoto
              :scene="world.scene"
              :progress="frame.t / (index === 0 ? 28000 : 24000)"
            />
          </div>

          <div class="recipe-caption">
            <span class="scene-note">{{ world.scene.note }}</span><strong>{{ world.scene.title }}</strong><MarketingHeroIconLabel
              :icon="world.icon"
              class="scene-detail"
            >
              {{ world.scene.detail }}
            </MarketingHeroIconLabel>
          </div>
        </div>
      </Transition>
    </div>

    <div
      ref="voicePanel"
      class="story-panel voice-panel"
      :class="{ 'panel-hidden': !speaking }"
    >
      <Transition
        name="story-world"
        :css="handoff < 0"
      >
        <div
          :key="index"
          class="voice-content world-content"
        >
          <template v-if="index !== 0">
            <MarketingHeroIconLabel
              :icon="world.icon"
              class="story-label"
            >
              {{ world.name }}
            </MarketingHeroIconLabel><strong class="world-action">{{ world.moments[frame.moment] }}</strong><div class="world-story-progress">
              <i
                v-for="n in world.moments.length"
                :key="n"
                :class="{ passed: frame.moment >= n - 1 }"
              />
            </div><small class="story-hint">{{ index === 1 ? frame.moment < 3 ? 'Noor entscheidet selbst, ob sie mitmacht.' : 'Ein gemeinsamer Einkauf. Für eure WG.' : index === 2 ? 'Beispielliste mit zwölf Einträgen.' : index === 4 ? 'Deine Geschenkideen bleiben getrennt vom Kuchen-Einkauf.' : world.recipeNote }}</small>
          </template><template v-else>
            <MarketingHeroIconLabel
              class="story-label"
              :icon="ready ? 'i-lucide-check-check' : frame.processing ? world.icon : 'i-lucide-mic'"
            >
              {{ shared ? frame.synced ? 'Auch bei Sam angekommen' : ready ? 'In eurer Freitagsliste' : frame.preview ? 'Erst prüfen, dann übernehmen' : 'Eure Liste ergänzen' : ready ? world.created : frame.processing ? 'Deine Worte werden zur Liste' : beat.label }}
            </MarketingHeroIconLabel>

            <div class="spoken-words">
              <span
                v-for="(word, i) in words"
                :key="i"
                :class="{ heard: frame.words * words.length > i }"
              >{{ word }}{{ ' ' }}</span>
            </div>

            <div
              class="story-progress"
              :class="{ 'progress-done': ready }"
            >
              <i :style="{ transform: `scaleX(${ready ? 1 : frame.words})` }" />
            </div>

            <div
              v-if="ready || frame.preview"
              class="story-result"
            >
              <span
                v-for="(item, i) in world.items"
                :key="item"
                :style="{ '--delay': `${i * 90}ms` }"
              ><UIcon :name="frame.preview ? 'i-lucide-plus' : 'i-lucide-check'" />{{ item }}</span><small>{{ shared ? frame.preview ? "Drei neue Einträge. Du entscheidest." : world.outcome : beat.result }}</small>
            </div>

            <small
              v-else
              class="story-hint"
            >{{ frame.processing ? 'Drei Zutaten bekommen ihren Platz.' : 'Einmal sagen. Später nachsehen.' }}</small>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.story-card{position:relative;width:100%;overflow:hidden;transition:height .7s cubic-bezier(.22,1,.36,1);background:var(--md-surface)}

.story-panel{position:absolute;inset:0 0 auto;transition:opacity .3s ease .18s,transform .65s cubic-bezier(.22,1,.36,1);opacity:1;transform:translateY(0) scale(1)}

.panel-hidden{transition:opacity .16s ease,transform .3s;opacity:0;transform:translateY(10px) scale(.97);pointer-events:none}

.world-content{width:100%}.story-photo{aspect-ratio:4/3;overflow:hidden}.story-photo img{display:block;width:100%;height:100%;object-fit:cover;will-change:transform}.recipe-caption{padding:12px 14px 15px}.recipe-caption>.scene-note{display:block;font-size:12px;line-height:1.4;color:var(--md-on-surface-variant)}.recipe-caption strong{display:block;font-size:24px;line-height:1.1;margin:7px 0 12px}.scene-detail,.story-label{font-size:12px;color:var(--demo-accent);font-weight:700}

.voice-content{padding:17px 15px}.spoken-words{font-size:22px;font-weight:700;line-height:1.25;margin:14px 0}.spoken-words span{opacity:.24;filter:blur(.5px);transition:opacity .3s,filter .3s}.spoken-words span.heard{opacity:1;filter:blur(0)}.story-progress{height:3px;background:var(--demo-soft);border-radius:3px;overflow:hidden;margin:0 0 13px}.story-progress i{display:block;height:100%;background:var(--demo-accent);transform-origin:left;transition:background .6s}.story-hint,.story-result>small{display:block;font-size:12px;line-height:1.4;color:var(--md-on-surface-variant)}.story-result{display:grid;gap:7px}.story-result>span{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:600;animation:ingredient-arrive .65s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--delay)}.story-result .iconify{width:16px;height:16px;color:var(--demo-accent)}.story-result>small{margin-top:5px}

.story-world-enter-active{transition:opacity .55s,transform .75s cubic-bezier(.22,1,.36,1);transition-delay:.28s}.story-world-leave-active{position:absolute;inset:0 0 auto;transition:opacity .28s,transform .4s}.story-world-enter-from{opacity:0;transform:translate(var(--arrival-x),var(--arrival-y)) scale(.97)}.story-world-leave-to{opacity:0;transform:translateY(-8px) scale(.98)}

@keyframes ingredient-arrive{from{opacity:0;transform:translate(var(--arrival-x),var(--arrival-y))}to{opacity:1;transform:translate(0,0)}}

@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.spoken-words span{opacity:1;filter:none}}
</style>

<style scoped>
.world-action{display:block;font-size:23px;line-height:1.2;margin:15px 0}.world-story-progress{display:flex;gap:4px;margin:15px 0}.world-story-progress>i{flex:1;height:3px;border-radius:4px;background:var(--demo-soft);transition:background .4s}.world-story-progress>i.passed{background:var(--demo-accent)}
</style>
