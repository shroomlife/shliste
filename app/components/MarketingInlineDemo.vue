<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

const props = withDefaults(defineProps<{
  mode?: string
  embedded?: boolean
}>(), { mode: 'recipe', embedded: false })
const root = ref<HTMLElement>()
const phase = ref(0)
const { style: paletteStyle, next: nextPalette } = useMarketingDemoPalette()
const paused = ref(false)
const reduced = ref(false)
const visible = ref(false)
const tabVisible = ref(true)
let observer: IntersectionObserver | undefined
let timer: ReturnType<typeof setInterval> | undefined
let media: MediaQueryList | undefined
const scenes = {
  recipe: { title: 'Was fehlt, landet auf deiner Liste.', icon: 'i-lucide-chef-hat', steps: ['Zutaten wählen', 'Vorrat abwählen', 'Liste auswählen', 'Schon auf der Liste'], note: 'Die ausgewählten Zutaten kommen auf deine Liste. Dein Rezept bleibt vollständig erhalten.' },
  shared: { title: 'Du ergänzt. Sam sieht’s beim Einkauf.', icon: 'i-lucide-users', steps: ['Rucola fehlt noch', 'Eintrag ergänzen', 'Gemeinsam sehen', 'Im Korb. Abgehakt.'], note: 'Gemeinsame Änderungen werden mit Anmeldung und Internet abgeglichen.' },
  photo: { title: 'Dein Rezept bekommt ein Gesicht.', icon: 'i-lucide-sparkles', steps: ['Rezept steht bereit', 'Bild wird erstellt', 'Das Ergebnis erscheint', 'Im Rezeptbuch bleiben'], note: 'Illustration der KI-Bilderstellung mit einem vorhandenen shliste-Rezeptbild. Dauer und Ergebnis variieren.' },
  voice: { title: 'Kurz sagen. Weniger tippen.', icon: 'i-lucide-mic', steps: ['Gedanken aussprechen', 'Worte erkennen', 'Einträge entstehen', 'Ergebnis prüfen'], note: 'Spracheingabe braucht Anmeldung und Internet. Prüfe erkannte Artikel und Mengen.' },
}
type Mode = keyof typeof scenes
const mode = computed<Mode>(() => props.mode in scenes ? props.mode as Mode : 'recipe')
const scene = computed(() => scenes[mode.value])
const running = computed(() => visible.value && tabVisible.value && !paused.value && !reduced.value)
const ingredients = ['Lasagneblätter', 'Tomaten', 'Olivenöl']
const stamp = '2026-11-02T12:00:00.000Z'
// Real ListItemRow, with isolated example objects. No database, login or sync writes.
function item(name: string, checked = false, quantity = 1): ListItem {
  return { id: name, listId: 'marketing-example', name, quantity, checked, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: stamp, updatedAt: stamp, deletedAt: null, fieldTimestamps: null }
}
const rows = computed(() => mode.value === 'voice' ? (phase.value >= 2 ? [item('Haferdrink', false, 2), item('Bananen'), item('Kaffee')] : []) : mode.value === 'shared' ? [item('Tomaten'), ...(phase.value >= 2 ? [item('Rucola', phase.value === 3)] : [])] : phase.value >= 2 ? [item('Lasagneblätter'), item('Tomaten')] : [])
function updateMotion() {
  reduced.value = media?.matches ?? false
}
function updateVisibility() {
  tabVisible.value = !document.hidden
}
function choose(index: number) {
  phase.value = index
  paused.value = true
}
watch(mode, () => {
  phase.value = 0
})
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  updateVisibility()
  media.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting
  }, { threshold: 0.25 })
  if (root.value)
    observer.observe(root.value)
})
watch(running, (play) => {
  clearInterval(timer)
  if (play)
    timer = setInterval(() => {
      phase.value = (phase.value + 1) % 4
      if (phase.value === 0)
        nextPalette()
    }, 3200)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearInterval(timer)
  media?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <figure
    ref="root"
    class="inline-demo"
    :class="{ 'is-still': !running, 'is-reduced': reduced, 'is-embedded': embedded }"
    :style="paletteStyle"
    :data-mode="mode"
    :data-phase="phase"
  >
    <div class="demo-heading">
      <span><UIcon :name="scene.icon" />{{ scene.title }}</span><button
        type="button"
        :aria-label="paused ? 'Animation fortsetzen' : 'Animation pausieren'"
        :disabled="reduced"
        @click="paused = !paused"
      >
        <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
      </button>
    </div>
    <!-- This visual stage is an explanation, not a second app. Step controls below provide an accessible equivalent. -->
    <div
      class="motion-canvas"
      aria-hidden="true"
      inert
    >
      <div class="canvas-grid" />
      <div class="scene-orbit orbit-one" /><div class="scene-orbit orbit-two" />
      <div class="app-pane source-pane">
        <MarketingAppToolbar />
        <MarketingListActions v-if="mode === 'shared'" />
        <MarketingListActions
          v-if="mode === 'recipe' || mode === 'photo'"
          recipe
        />
        <template v-if="mode === 'recipe'">
          <div class="recipe-banner">
            <img
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
            ><div><span>Dein Rezeptbuch</span><h3>Lasagne für alle</h3></div>
          </div>
          <div class="ingredient-sheet">
            <div class="sheet-handle" /><strong>Zutaten zur Liste</strong><small>Was soll mit?</small><div
              v-for="(name, index) in ingredients"
              :key="name"
              class="ingredient"
              :class="{ 'is-unselected': index === 2 && phase > 0 }"
            >
              <UIcon :name="index === 2 && phase > 0 ? 'i-lucide-square' : 'i-lucide-square-check-big'" /><span>{{ name }}</span><small v-if="index === 2 && phase > 0">schon da</small>
            </div><div class="app-action">
              {{ phase === 0 ? '3 Zutaten ausgewählt' : '2 Zutaten ausgewählt' }}<UIcon name="i-lucide-arrow-right" />
            </div>
          </div>
        </template>
        <template v-else-if="mode === 'shared'">
          <div class="pane-title">
            <span class="person-badge"><b class="optical-center">R</b><span>Robin<small>zu Hause · Android</small></span></span><h3>Freitag mit Freunden</h3><span class="member"><UIcon name="i-lucide-users" /> Mit Sam geteilt</span>
          </div>
          <div class="source-rows">
            <ListItemRow :item="item('Tomaten')" /><div class="row-slot">
              <Transition name="row">
                <ListItemRow
                  v-if="phase > 0"
                  :item="item('Rucola', phase === 3)"
                  :just-changed="phase === 3"
                  changed-by="Sam"
                />
              </Transition>
            </div>
          </div>
          <MarketingListInputBar :value="phase === 0 ? 'Rucola' : ''" />
        </template>
        <template v-else-if="mode === 'photo'">
          <div class="pane-title">
            <span class="eyebrow">Dein Rezept</span><h3>Lasagne für alle</h3><p>Tomaten, cremige Schichten.<br>Und alle sitzen am Tisch.</p>
          </div>
          <div
            class="image-workspace"
            :class="{ 'image-ready': phase >= 2 }"
          >
            <div class="image-placeholder">
              <UIcon name="i-lucide-image" /><span>{{ phase === 0 ? 'Noch ohne Bild' : 'Dein Rezept nimmt Gestalt an' }}</span>
            </div><img
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
            ><div
              v-if="phase === 1"
              class="image-scan"
            /><span
              v-if="phase >= 2"
              class="image-badge"
            ><UIcon name="i-lucide-sparkles" />Dein Rezeptbild</span>
          </div>
          <div class="small-status">
            <UIcon :name="phase === 1 ? 'i-lucide-sparkles' : 'i-lucide-image'" />{{ phase === 0 ? 'Ein Bild zum Rezept erstellen' : phase === 1 ? 'Bild wird erstellt …' : 'Passt zu deiner Sammlung.' }}
          </div>
        </template>
        <template v-else>
          <div class="pane-title">
            <span class="eyebrow">Liste per Sprache</span><h3>Was brauchen wir noch?</h3>
          </div>
          <div class="voice-orb">
            <UIcon name="i-lucide-mic" />
          </div><div class="waveform">
            <i
              v-for="n in 21"
              :key="n"
              :style="{ '--bar': `${12 + (n * 17 % 38)}px`, '--delay': `${n * -85}ms` }"
            />
          </div>
          <div
            class="transcript"
            :class="{ recognized: phase > 0 }"
          >
            „<span>2 Haferdrink</span>,<br><span>Bananen</span> und <span>Kaffee</span>.“
          </div>
        </template>
      </div>
      <div class="connection-path">
        <svg
          viewBox="0 0 300 180"
          fill="none"
        ><path d="M 0 125 C 90 125, 80 10, 165 25 S 220 140, 300 100" /></svg>
      </div>
      <div
        v-if="phase === 2 && mode !== 'photo'"
        :key="`${mode}-${phase}`"
        class="flying-ingredient"
      >
        <UIcon :name="mode === 'voice' ? 'i-lucide-mic' : 'i-lucide-check'" />{{ mode === 'recipe' ? 'Tomaten' : mode === 'shared' ? 'Rucola' : '2 × Haferdrink' }}
      </div>
      <div
        class="app-pane target-pane"
        :class="{ 'target-arrived': phase >= 2 }"
      >
        <template v-if="mode !== 'photo'">
          <div
            v-if="mode === 'shared'"
            class="recipient-bar"
          >
            <UIcon name="i-lucide-smartphone" /> shliste im Browser <UIcon name="i-lucide-wifi" />
          </div><div class="target-heading">
            <span
              v-if="mode === 'shared'"
              class="person-avatar person-avatar--sam optical-center"
            >S</span><span
              v-else
              class="target-icon"
            ><UIcon name="i-lucide-list-checks" /></span><div><span class="eyebrow">{{ mode === 'shared' ? 'Sam · iPhone im Laden' : 'Deine Einkaufsliste' }}</span><h3>{{ mode === 'voice' ? 'Für zu Hause' : 'Freitag mit Freunden' }}</h3></div>
          </div>
          <div class="target-rows">
            <TransitionGroup name="row">
              <div
                v-for="(row, index) in rows"
                :key="row.id"
                :style="{ '--row-delay': `${index * 130}ms` }"
              >
                <ListItemRow
                  :item="row"
                  :just-changed="phase === 2 && (mode !== 'shared' || row.name === 'Rucola')"
                  :changed-by="mode === 'shared' && row.name === 'Rucola' ? 'Robin' : null"
                />
              </div>
            </TransitionGroup><div
              v-if="!rows.length"
              class="list-placeholder"
            >
              <span /><span /><p>{{ mode === 'voice' ? 'Hier stehen gleich deine Besorgungen.' : 'Hier landen die Zutaten, die du noch brauchst.' }}</p>
            </div>
          </div>
          <div class="target-footer">
            <UIcon :name="phase === 3 ? 'i-lucide-circle-check' : 'i-lucide-arrow-down-to-line'" />{{ phase < 2 ? 'Bereit für deinen Einkauf' : phase === 2 ? 'Einträge sind angekommen' : mode === 'shared' ? 'Rucola liegt im Korb' : mode === 'voice' ? 'Erkannt. Jetzt kurz prüfen.' : 'Öl bleibt im Schrank.' }}
          </div>
        </template>
        <template v-else>
          <div class="target-heading">
            <span class="target-icon"><UIcon name="i-lucide-book-open" /></span><div><span class="eyebrow">Deine Sammlung</span><h3>Zum Wiederkochen.</h3></div>
          </div>
          <div
            class="saved-recipe"
            :class="{ 'saved-recipe-ready': phase >= 2 }"
          >
            <img
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
            ><div><UIcon name="i-lucide-chef-hat" /><h3>Lasagne für alle</h3><span>Rezept & Bild zusammen</span></div>
          </div><div class="target-footer">
            <UIcon name="i-lucide-heart" />Eine Idee, die bleiben darf.
          </div>
        </template>
      </div>
      <div
        :key="`${mode}-caption-${phase}`"
        class="scene-label"
      >
        <span />{{ scene.steps[phase] }}
      </div>
    </div>
    <div
      class="demo-controls"
      aria-label="Beispielschritt auswählen"
    >
      <button
        v-for="(step, index) in scene.steps"
        :key="step"
        type="button"
        :aria-pressed="phase === index"
        :aria-label="step"
        @click="choose(index)"
      >
        <span class="step-dot optical-center">{{ index + 1 }}</span><span>{{ step }}</span>
      </button>
    </div>
    <figcaption><strong>Animiertes App-Beispiel.</strong> {{ scene.note }}</figcaption>
  </figure>
</template>

<style scoped>
.inline-demo{container-type:inline-size;margin:28px 0 36px;border:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);border-radius:26px;background:var(--md-surface);overflow:hidden;color:var(--md-on-surface)}
.demo-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;font-weight:700;font-size:18px}.demo-heading>span{display:flex;align-items:center;gap:10px}.demo-heading .iconify{flex-shrink:0;width:20px;height:20px;color:var(--demo-accent)}.demo-heading button{display:grid;place-items:center;flex-shrink:0;width:44px;height:44px;border:1px solid color-mix(in srgb,var(--demo-accent) 19%,transparent);border-radius:50%;cursor:pointer}.demo-heading button:disabled{opacity:.5;cursor:default}
.motion-canvas{height:520px;position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 25% 20%,#fff9fc,transparent 60%),linear-gradient(130deg,#f9e4f1,#f7edf4 55%,#eaf3df);font-family:var(--font-sans);color:#33202d}.canvas-grid{position:absolute;inset:0;background-image:radial-gradient(color-mix(in srgb,var(--demo-accent) 15%,transparent) .8px,transparent .8px);background-size:20px 20px;mask-image:linear-gradient(transparent,#000,transparent)}.scene-orbit{position:absolute;border:1px solid color-mix(in srgb,var(--demo-accent) 9%,transparent);border-radius:50%;width:430px;height:430px;left:calc(50% - 215px);top:0}.orbit-two{width:560px;height:560px;left:calc(50% - 280px);top:-65px}
.app-pane{color:var(--md-on-surface);position:absolute;border:1px solid #fff;border-radius:22px;background:var(--md-surface);box-shadow:0 22px 60px -22px #76275655,0 2px 4px #7627560c;overflow:hidden;transition:transform 900ms cubic-bezier(.22,1,.36,1),opacity 700ms}.source-pane{top:22px;left:5%;width:44%;max-width:360px;transform:rotate(-2deg);z-index:2}.pane-toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--md-secondary)}.pane-toolbar img{width:83px;height:26px;object-fit:contain}.pane-toolbar .iconify{width:22px;height:22px}.recipe-banner{height:110px;position:relative;overflow:hidden}.recipe-banner>img{width:100%;height:100%;object-fit:cover;object-position:50% 45%;opacity:.5}.recipe-banner>div{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:end;padding:14px 18px;background:linear-gradient(transparent,var(--md-surface))}.recipe-banner span,.eyebrow{font-size:13px;color:#785b70}.app-pane h3{font-size:24px;line-height:1.15;font-weight:800;margin:0}.ingredient-sheet{padding:0 18px 16px}.sheet-handle{width:28px;height:3px;background:#d3becb;margin:0 auto 9px;border-radius:3px}.ingredient-sheet>strong{font-size:20px;display:block;line-height:1.2}.ingredient-sheet>small{display:block;color:#785b70}.ingredient{display:flex;align-items:center;gap:10px;min-height:35px;transition:opacity .5s}.ingredient>.iconify{width:20px;height:20px;color:#b84c8f}.ingredient>span{font-size:18px}.ingredient small{margin-left:auto;font-size:12px}.ingredient.is-unselected{opacity:.5}.app-action{margin-top:8px;display:flex;align-items:center;justify-content:space-between;background:#b84c8f;color:white;border-radius:12px;padding:9px 13px;font-weight:700;font-size:16px}.app-action .iconify{width:18px;height:18px}.pane-title{padding:20px 18px 12px}.pane-title p{font-size:17px;line-height:1.3;margin-top:8px}.member{display:flex;align-items:center;margin-top:12px;font-size:14px;gap:4px}.member b{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#f9d8eb;border:2px solid var(--md-surface);color:#843267}.member b+b{margin-left:-10px;margin-right:4px;background:#d6e8be;color:#3d502c}.demo-input{display:flex;align-items:center;justify-content:space-between;border:1px solid #b84c8f80;margin:8px 16px 14px;border-radius:12px;padding:10px 12px;font-size:20px}.demo-input>.iconify{background:#b84c8f;color:white;width:30px;height:30px;padding:5px;border-radius:9px}.typed-text{display:block;width:6ch;white-space:nowrap;overflow:hidden;animation:typing 1.1s steps(6) both}.source-rows,.target-rows{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;padding:0 14px}.source-rows{height:127px;grid-auto-rows:60px;align-content:start}.row-slot{height:60px;min-width:0}.small-status{display:flex;align-items:center;gap:7px;padding:12px 16px;font-size:13px;color:#785b70}.small-status .iconify{width:16px;height:16px;flex-shrink:0}
.target-pane{top:98px;right:5%;width:43%;max-width:350px;z-index:3;transform:rotate(3deg) translateY(10px)}.target-arrived{transform:rotate(0) translateY(0)}.target-heading{display:flex;gap:10px;align-items:center;padding:18px 14px}.target-heading h3{font-size:21px}.target-icon{display:grid;place-items:center;background:#f8dcec;color:var(--demo-accent);width:40px;height:40px;border-radius:13px;flex-shrink:0}.target-icon .iconify{width:22px;height:22px}.target-footer{display:flex;align-items:center;gap:8px;margin:14px;padding:10px;background:#edf3e4;border-radius:10px;font-size:15px;color:#465c31}.target-footer .iconify{width:18px;height:18px;flex-shrink:0}.list-placeholder{height:127px}.list-placeholder>span{display:block;height:18px;background:#f5edf1;border-radius:5px;width:85%;margin:6px 0}.list-placeholder>span+span{width:60%}.list-placeholder p{font-size:16px;line-height:1.4;color:#8b7382;margin-top:16px}.target-rows:deep(.min-h-15),.source-rows:deep(.min-h-15){height:60px;min-height:60px}.target-rows:deep(.text-\[1\.25rem\]),.source-rows:deep(.text-\[1\.25rem\]){font-size:18px}
.connection-path{position:absolute;left:35%;top:80px;width:30%;z-index:1;color:#b84c8f60}.connection-path svg{width:100%;height:180px}.connection-path path{stroke:currentColor;stroke-width:2;stroke-dasharray:5 7}.flying-ingredient{position:absolute;left:35%;top:210px;z-index:5;display:flex;align-items:center;gap:8px;white-space:nowrap;border-radius:12px;padding:11px 18px;background:#b84c8f;color:white;box-shadow:0 10px 30px color-mix(in srgb,var(--demo-accent) 25%,transparent);font-size:20px;font-weight:700;animation:ingredient-flight 1.2s cubic-bezier(.4,0,.2,1) both}.flying-ingredient .iconify{width:20px;height:20px}.scene-label{position:absolute;bottom:17px;left:50%;translate:-50% 0;z-index:6;display:flex;align-items:center;gap:8px;white-space:nowrap;background:#fffdf9eF;border:1px solid #fff;padding:8px 18px;border-radius:30px;box-shadow:0 6px 20px #76275615;font-size:16px;font-weight:700;}.scene-label>span{width:7px;height:7px;background:#b84c8f;border-radius:50%}
.image-workspace{height:185px;margin:0 16px;border-radius:14px;position:relative;overflow:hidden;background:linear-gradient(130deg,#f6e2ef,#e8eddc)}.image-placeholder{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:12px;font-size:16px;color:#a3688e}.image-placeholder .iconify{width:36px;height:36px}.image-workspace>img{width:100%;height:100%;object-fit:cover;clip-path:inset(100% 0 0);filter:blur(12px);transform:scale(1.1);transition:clip-path 1.3s cubic-bezier(.22,1,.36,1),filter 1.4s,transform 2s}.image-ready>img{clip-path:inset(0);filter:blur(0);transform:scale(1)}.image-scan{position:absolute;inset:-80% 0;background:linear-gradient(transparent 40%,#e064b275 50%,transparent 60%);animation:scan 1.7s ease-in-out infinite}.image-badge{position:absolute;bottom:10px;left:10px;padding:5px 10px;background:#fffef5eF;border-radius:20px;display:flex;align-items:center;gap:5px;font-size:13px}.saved-recipe{margin:0 14px;border-radius:16px;position:relative;overflow:hidden;height:160px;background:var(--md-secondary)}.saved-recipe>img{height:100%;width:100%;object-fit:cover;opacity:0;transition:opacity 1.5s .3s}.saved-recipe-ready>img{opacity:.55}.saved-recipe>div{position:absolute;inset:0;padding:18px;display:flex;flex-direction:column;justify-content:end;background:linear-gradient(transparent,var(--md-surface))}.saved-recipe .iconify{width:24px;height:24px;color:#b84c8f;margin-bottom:8px}.saved-recipe span{font-size:15px;margin-top:5px}.voice-orb{width:62px;height:62px;border-radius:50%;background:#b84c8f;color:white;display:grid;place-items:center;margin:8px auto;box-shadow:0 0 0 10px #b84c8f0a,0 0 0 20px #b84c8f05}.voice-orb .iconify{width:28px;height:28px}.waveform{height:66px;display:flex;align-items:center;justify-content:center;gap:4px}.waveform i{width:4px;height:var(--bar);border-radius:4px;background:#c65c9f;animation:wave .8s var(--delay) alternate infinite}.transcript{font-size:24px;line-height:1.4;padding:0 20px 24px;text-align:center}.transcript span{transition:background .5s,color .5s}.recognized span{background:#f9dfef;color:#96326f;border-radius:5px}
.demo-controls{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:16px 14px 10px}.demo-controls button{display:flex;align-items:center;gap:7px;padding:9px 8px;min-height:48px;line-height:1.2;font-size:14px;text-align:left;border-radius:12px;cursor:pointer;transition:background .25s}.step-dot{box-sizing:border-box;line-height:1;font-size:14px;font-variant-numeric:tabular-nums;display:grid;place-items:center;flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#f6edf2;color:#8a4972;font-weight:800}.demo-controls button[aria-pressed=true]{background:#f9e5f1;color:#96326f}.demo-controls button[aria-pressed=true] .step-dot{background:var(--demo-accent);color:white}.inline-demo figcaption{font-size:13px;line-height:1.5;color:var(--md-on-surface-variant);padding:4px 22px 20px}.inline-demo button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:2px}.is-still :deep(*){animation-play-state:paused!important}.is-still .typed-text{animation:none;width:6ch}.is-still .flying-ingredient{display:none}.row-enter-active{transition:opacity .35s var(--row-delay,0ms),transform .5s cubic-bezier(.2,.8,.2,1) var(--row-delay,0ms)}.row-leave-active{transition:opacity .3s,transform .3s}.row-enter-from{opacity:0;transform:translateY(12px)}.row-leave-to{opacity:0;transform:translateX(20px)}
@keyframes typing{from{width:0}to{width:6ch}}@keyframes ingredient-flight{0%{opacity:0;transform:translate(-30px,45px) scale(.9) rotate(-8deg)}15%{opacity:1}55%{opacity:1;transform:translate(45px,-80px) scale(1.1) rotate(5deg)}100%{opacity:0;transform:translate(130px,30px) scale(.85)}}@keyframes label-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes scan{from{transform:translateY(-25%)}to{transform:translateY(25%)}}@keyframes wave{to{height:8px;opacity:.5}}
@container(max-width:560px){.demo-heading{padding:10px 14px;font-size:16px;line-height:1.2}.motion-canvas{height:470px}.source-pane{left:7%;width:86%;top:18px;max-width:none;transform:rotate(-1deg)}.target-pane{width:86%;max-width:none;right:7%;top:155px;padding-bottom:14px;transform:translateY(210px) rotate(3deg);opacity:0;pointer-events:none}.target-arrived{opacity:1;transform:translateY(0) rotate(1deg)}.target-heading{padding:14px}.source-pane .recipe-banner{height:100px}.connection-path{display:none}.flying-ingredient{left:25%;top:170px}.demo-controls{grid-template-columns:repeat(2,1fr);padding:10px;gap:4px}.demo-controls button{font-size:13px}.inline-demo figcaption{padding:6px 16px 16px}.scene-label{bottom:15px}.pane-title h3{font-size:23px}.target-rows{gap:5px}.target-rows:deep(.min-h-15){min-height:60px}.target-footer{display:none}.image-workspace{height:175px}[data-phase='2'] .source-pane,[data-phase='3'] .source-pane{transform:translateY(-12px) scale(.96);opacity:.6}}
@media(prefers-reduced-motion:reduce){.inline-demo :deep(*){animation:none!important;transition:none!important}.flying-ingredient{display:none}}
/* Material roles vary together, including the original wordmark silhouette. */
.demo-wordmark{display:block;width:83px;height:26px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') center/contain no-repeat;transition:background 1.2s}
.motion-canvas{background:radial-gradient(ellipse at 25% 20%,var(--md-surface),transparent 60%),var(--demo-canvas);color:var(--md-on-surface);transition:background-color 1.2s}
.demo-heading .iconify,.ingredient>.iconify,.pane-toolbar,.saved-recipe .iconify{color:var(--demo-accent)}.pane-toolbar,.target-icon,.member b,.recognized span{background:var(--demo-soft);color:var(--demo-accent);transition:background-color 1.2s,color 1.2s}.eyebrow,.recipe-banner span,.ingredient-sheet>small,.small-status,.list-placeholder p{color:var(--md-on-surface-variant)}.app-action,.demo-input>.iconify,.voice-orb,.flying-ingredient{background:var(--demo-accent);transition:background-color 1.2s}.demo-input{border-color:color-mix(in srgb,var(--demo-accent) 40%,transparent)}.scene-label>span,.waveform i{background:var(--md-primary)}.connection-path{color:color-mix(in srgb,var(--demo-accent) 40%,transparent)}.image-workspace{background:var(--demo-soft)}.image-placeholder{color:var(--demo-accent)}.demo-controls button[aria-pressed=true]{background:var(--demo-soft);color:var(--demo-accent)}.demo-controls button[aria-pressed=true] .step-dot{background:var(--demo-accent);color:white}.inline-demo button:focus-visible{outline-color:var(--demo-accent)}
.is-embedded{position:relative;border:0;background:transparent;border-radius:0;margin:0;width:100%;max-width:660px;margin-inline:auto;overflow:visible}.is-embedded .demo-heading{position:absolute;right:10px;top:10px;padding:0;z-index:8}.is-embedded .demo-heading>span{display:none}.is-embedded .demo-heading button{width:36px;height:36px;background:var(--md-surface);border-color:color-mix(in srgb,var(--demo-accent) 20%,transparent)}.is-embedded .motion-canvas{border-radius:28px}.is-embedded .scene-orbit{opacity:.4}.is-embedded .canvas-grid{opacity:.4}.is-embedded .demo-controls{display:flex;justify-content:center;gap:8px;padding:14px 0 8px}.is-embedded .demo-controls button{position:relative;flex:none;width:44px;height:44px;min-height:44px;display:grid;place-items:center;padding:0;border-radius:50%}.is-embedded .demo-controls button>span:not(.step-dot){position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.is-embedded .step-dot{width:34px;height:34px;font-size:16px}.is-embedded figcaption{padding:0 12px 0;text-align:center;font-size:12px;max-width:510px;margin:auto;line-height:1.45}.is-embedded figcaption strong{font-weight:400}
/* Keep every list slot stable throughout the loop, including attribution and reset. */
.target-rows{align-content:start;grid-auto-rows:60px;min-height:127px;position:relative}
[data-mode="voice"] .target-rows{min-height:194px}
.target-rows .row-leave-active{position:absolute;left:14px;right:14px}
.source-rows :deep(button),.target-rows :deep(button){line-height:1.2}
.source-rows :deep(.text-\[0\.875rem\]),.target-rows :deep(.text-\[0\.875rem\]){line-height:16px}
.person-badge{display:flex;align-items:center;gap:9px;margin-bottom:12px;font-size:16px;font-weight:700;line-height:1.1}
.person-badge>b,.person-avatar{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);font-size:18px;line-height:1;box-sizing:border-box}
.person-badge small{display:block;font-size:12px;font-weight:400;color:var(--md-on-surface-variant);margin-top:4px}
.person-avatar--sam{background:#dcebd6;color:#456642}
.member .iconify{width:16px;height:16px}.input-placeholder{font-size:16px;opacity:.5}
.recipient-bar{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#eaf1e4;color:#456642;font-size:12px;line-height:1}.recipient-bar .iconify{width:14px;height:14px}.recipient-bar .iconify:last-child{margin-left:auto}
[data-mode="shared"] .target-heading{min-height:90px;padding-block:12px}
[data-mode="shared"] .motion-canvas{height:540px}
[data-mode="shared"] .source-pane{border-radius:27px;border:3px solid color-mix(in srgb,var(--demo-accent) 22%,var(--md-surface))}
[data-mode="shared"] .target-pane{top:72px;border-radius:27px;border:3px solid #cfdbc5}
@container(max-width:560px){[data-mode="shared"] .motion-canvas{height:600px}[data-mode="shared"] .target-pane{top:180px}[data-mode="shared"] .target-footer{display:flex;font-size:13px;margin-block:10px}.person-badge{margin-bottom:8px}.pane-title{padding-top:14px}}
.target-rows .list-placeholder{grid-row:span 2}[data-mode="voice"] .motion-canvas{height:560px}
@container(max-width:560px){[data-mode="recipe"] .motion-canvas{height:510px}[data-mode="voice"] .motion-canvas{height:550px}[data-mode="photo"] .motion-canvas{height:540px}}
@container(max-width:360px){.inline-demo:not(.is-embedded) .demo-controls button{flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;min-width:0;min-height:82px;padding:8px 4px;gap:7px}.inline-demo:not(.is-embedded) .demo-controls button>span:last-child{max-width:100%;overflow-wrap:anywhere}}

.motion-canvas{background:radial-gradient(ellipse at 25% 20%,var(--md-surface),transparent 65%),var(--demo-canvas);color:var(--md-on-surface);transition:background .6s}.target-pane{border-color:var(--demo-soft)!important}.person-avatar--sam,.recipient-bar{background:var(--demo-soft);color:var(--demo-accent)}.scene-label{background:var(--md-surface)}.app-pane{transition:transform 900ms cubic-bezier(.2,0,0,1),opacity .7s,background .6s}.row-enter-active,.row-leave-active{transition:opacity .3s,transform .45s cubic-bezier(.2,0,0,1)}.row-enter-from{transform:translateY(8px);opacity:0}.row-leave-to{transform:translateY(-4px);opacity:0}
[data-mode="shared"] .source-rows{margin-bottom:16px}[data-mode="shared"] .pane-title{background:linear-gradient(var(--demo-soft),transparent);padding-top:14px}[data-mode="shared"] .person-badge{margin-bottom:8px}
</style>
