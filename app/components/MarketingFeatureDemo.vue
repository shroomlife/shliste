<script setup lang="ts">
import type { List, ListItem } from '#shared/types/domain'

const { mode } = defineProps<{ mode: 'overview' | 'badge' | 'secret' }>()
const scenes = {
  overview: { title: 'Alles Wichtige auf einen Blick.', steps: ['Deine Listen im Überblick', 'Sam ergänzt zwei Einträge', 'In der Liste nachsehen', 'Der Einkauf ist erledigt'], note: 'Listenkarten mit Zähler, neuen Einträgen und Fortschritt wie in der App.' },
  badge: { title: 'Selbst gekocht. Das bleibt.', steps: ['Der letzte Kochschritt', 'Fertig gekocht!', 'Badge verdient', 'In deiner Sammlung'], note: 'Beim ersten Fertigkochen eines Rezepts erhältst du einen Badge. Beim erneuten Kochen gibt es wieder Konfetti.' },
  secret: { title: 'Die Überraschung bleibt bei dir.', steps: ['Geheime Liste öffnen', 'Entsperren bestätigen', 'Bestätigung erhalten', 'Jetzt ist die Liste offen'], note: 'Nachgebildeter Android-Ablauf. Biometrie oder Displaysperre entsperren die Liste. Der Systemdialog hängt vom Gerät ab.' },
}
const scene = computed(() => scenes[mode])
const { root, phase, paused, reduced, running, choose } = useMarketingPlayback(4, step => mode === 'badge' && step === 2 ? 6000 : 3500)
const { style, index, next } = useMarketingDemoPalette()
watch(phase, (value, previous) => {
  if (value === 0 && previous === 3 && running.value) next()
})
const stamp = '2026-11-03T12:00:00.000Z'
function list(id: string, name: string, secret = false): List {
  return { id, name, secret, color: id === 'week' ? '#94A97F' : id === 'surprise' ? '#B796D5' : String(style.value['--md-primary']), createdAt: stamp, updatedAt: stamp, deletedAt: null, fieldTimestamps: null, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null }
}
function item(name: string): ListItem {
  return { id: name, listId: 'preview', name, checked: false, quantity: 1, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: stamp, updatedAt: stamp, deletedAt: null, fieldTimestamps: null }
}
</script>

<template>
  <figure
    ref="root"
    class="feature-demo"
    :style="style"
    :class="{ 'is-still': !running, 'is-reduced': reduced }"
    :data-feature="mode"
    :data-phase="phase"
    :data-palette="index"
  >
    <div class="feature-top">
      <span>{{ scene.title }}</span><button
        type="button"
        :disabled="reduced"
        :aria-label="paused ? 'Beispiel fortsetzen' : 'Beispiel pausieren'"
        @click="paused = !paused"
      >
        <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
      </button>
    </div>
    <div
      class="feature-stage"
      aria-hidden="true"
      inert
    >
      <div class="feature-halo" />
      <div class="feature-phone">
        <div class="feature-screen">
          <div class="feature-status">
            <span>9:41</span><i /><span><UIcon name="i-lucide-wifi" /><UIcon name="i-lucide-battery-full" /></span>
          </div>
          <MarketingAppToolbar v-if="mode !== 'secret' || phase === 0 || phase === 3" />
          <MarketingListActions
            v-if="mode === 'secret' && phase === 3"
            :shared="false"
          />
          <MarketingListActions
            v-if="mode === 'badge' && phase < 3"
            recipe
          />
          <div
            v-if="mode === 'overview'"
            class="feature-content list-overview"
          >
            <ListCard
              :list="list('friday', 'Freitag mit Freunden')"
              :open-count="phase === 3 ? 0 : phase > 0 ? 5 : 3"
              :done-count="phase === 3 ? 8 : 3"
              is-shared
              :unseen-count="phase === 1 ? 2 : 0"
              :just-changed="phase === 1"
            />
            <ListCard
              :list="list('week', 'Für die Woche')"
              :open-count="4"
            />
            <ListCard
              :list="list('surprise', 'Für Sams Geburtstag', true)"
              :open-count="3"
            />
            <div class="floating-actions">
              <span><UIcon name="i-lucide-mic" /></span><span><UIcon name="i-lucide-plus" /> Liste</span>
            </div>
          </div>
          <div
            v-else-if="mode === 'badge'"
            class="feature-content recipe-content"
          >
            <img
              class="feature-recipe-image"
              src="/images/recipes/lasagne.webp"
              alt=""
              width="600"
              height="400"
            >
            <div class="recipe-copy">
              <small>Dein Rezept</small><h3>Lasagne für alle</h3><p class="cook-step completed">
                <b class="optical-center">3</b><span class="cook-step__text">Lasagne schichten.</span><UIcon name="i-lucide-check" />
              </p><p
                class="cook-step"
                :class="{ completed: phase > 0 }"
              >
                <b class="optical-center">4</b><span class="cook-step__text">Goldbraun backen und servieren.</span><UIcon :name="phase > 0 ? 'i-lucide-check' : 'i-lucide-square'" />
              </p>
            </div>
            <MarketingBadgeMoment
              v-if="phase >= 2"
              name="Lasagne für alle"
              image="/images/recipes/lasagne.webp"
              date="03.11.2026"
              :collection="phase === 3"
            />
          </div>
          <div
            v-else
            class="feature-content secret-content"
          >
            <div
              v-if="phase === 0"
              class="secret-start"
            >
              <ListCard
                :list="list('week', 'Für die Woche')"
                :open-count="4"
              /><MarketingSecretListCard name="Für Sams Geburtstag" />
            </div>
            <div
              v-else-if="phase < 3"
              class="secret-locked"
            >
              <UIcon name="i-lucide-lock-keyhole" /><h3>Geheime Liste</h3><p>Entsperre die Liste,<br>um ihre Einträge zu sehen.</p><div class="unlock-action">
                <UIcon name="i-lucide-fingerprint" />Entsperren
              </div>
            </div>
            <Transition name="unlock">
              <div
                v-if="phase === 3"
                class="secret-revealed"
              >
                <small>Entsperrt</small><h3>Für Sams Geburtstag</h3><ListItemRow :item="item('Konzertkarten')" /><ListItemRow :item="item('Lieblingsschokolade')" /><ListItemRow :item="item('Geburtstagskarte')" />
              </div>
            </Transition>
            <Transition name="sheet">
              <div
                v-if="phase === 1 || phase === 2"
                class="biometric-sheet"
              >
                <div class="sheet-grip" /><h3>Geheime Liste</h3><p>Entsperre mit Biometrie<br>oder deiner Displaysperre</p><div
                  class="fingerprint"
                  :class="{ verified: phase === 2 }"
                >
                  <UIcon :name="phase === 2 ? 'i-lucide-check' : 'i-lucide-fingerprint'" /><span class="scan-ring" />
                </div><strong>{{ phase === 2 ? 'Bestätigt' : 'Fingerabdruck bestätigen' }}</strong><small>{{ phase === 2 ? 'Deine Liste wird geöffnet' : 'Alternativ: Displaysperre verwenden' }}</small>
              </div>
            </Transition>
          </div>
          <MarketingListInputBar v-if="mode === 'secret' && phase === 3" />
          <MarketingAppBottomBar v-else-if="mode === 'overview' || (mode === 'secret' && phase === 0)" />
          <hr
            v-else
            class="native-bottom-divider"
            aria-hidden="true"
          >
          <div class="feature-gesture" />
        </div>
      </div>
      <div
        :key="`${mode}-${phase}`"
        class="feature-callout"
      >
        <UIcon :name="mode === 'badge' ? 'i-lucide-award' : mode === 'secret' ? 'i-lucide-shield-check' : 'i-lucide-list-checks'" /><span>{{ scene.steps[phase] }}</span>
      </div>
    </div>
    <div
      class="feature-controls"
      :aria-label="`${scene.title} Schritt auswählen`"
    >
      <button
        v-for="(step, i) in scene.steps"
        :key="step"
        type="button"
        :aria-label="step"
        :aria-pressed="phase === i"
        @click="choose(i)"
      >
        <span class="optical-center">{{ i + 1 }}</span>
      </button>
    </div>
    <figcaption>Beispieldaten</figcaption>
  </figure>
</template>

<style scoped>
.feature-demo{container-type:inline-size;margin:0;width:100%;color:var(--md-on-surface)}.feature-top{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 8px 12px;font-size:17px;font-weight:700}.feature-top button{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border:1px solid var(--demo-soft);border-radius:50%;color:var(--demo-accent);cursor:pointer}.feature-top .iconify{width:18px;height:18px}.feature-top button:disabled{opacity:.5}
.feature-stage{height:610px;position:relative;overflow:hidden;isolation:isolate;border-radius:30px;background:linear-gradient(145deg,var(--demo-canvas),var(--md-surface));transition:background .6s}.feature-halo{position:absolute;width:430px;height:430px;border:1px solid color-mix(in srgb,var(--demo-accent) 15%,transparent);border-radius:50%;left:50%;top:90px;translate:-50% 0}.feature-phone{position:relative;width:292px;margin:20px auto 0;padding:6px;border-radius:37px;background:linear-gradient(125deg,#fff,#cac4cb 55%,#f3eef4);box-shadow:0 26px 50px -20px #28202c40,0 0 0 1px #50435c1a}.feature-screen{overflow:hidden;border-radius:31px;background:var(--md-surface);border:1px solid #33253818}.feature-status{height:29px;padding:5px 17px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;position:relative}.feature-status>i{width:8px;height:8px;border-radius:50%;background:#2c2730;position:absolute;left:calc(50% - 4px);top:10px}.feature-status>span:last-child{display:flex;gap:4px}.feature-status .iconify{width:14px;height:14px}.feature-content{height:368px;position:relative;overflow:hidden}.list-overview{display:flex;flex-direction:column;gap:11px;padding:14px 11px}.list-overview :deep(a){padding:13px;min-height:75px}.list-overview :deep(.text-\[1\.375rem\]){font-size:20px}.list-overview :deep(.h-full){transition:width .7s cubic-bezier(.2,0,0,1)}.floating-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:auto}.floating-actions>span{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--md-primary);color:white;border-radius:14px;padding:12px;font-size:17px;box-shadow:0 3px 7px #33253820}.floating-actions>span:first-child{background:var(--md-secondary-container);color:var(--md-on-surface)}.floating-actions .iconify{width:22px;height:22px}.feature-gesture{width:76px;height:4px;border-radius:3px;background:var(--md-on-surface);opacity:.65;margin:7px auto 9px}.feature-callout{position:absolute;bottom:15px;left:50%;translate:-50% 0;display:flex;align-items:center;gap:9px;padding:10px 17px;background:var(--md-surface);border:1px solid var(--demo-soft);border-radius:24px;white-space:nowrap;font-size:16px;font-weight:700;color:var(--demo-accent);animation:callout-in .45s ease both}.feature-callout .iconify{width:20px;height:20px;flex-shrink:0}
.feature-recipe-image{display:block;width:100%;height:144px;object-fit:cover}.recipe-copy{padding:15px}.feature-content h3{font-weight:800;font-size:24px;line-height:1.12;margin:4px 0 16px}.recipe-copy>small,.secret-revealed>small{font-size:13px;color:var(--md-on-surface-variant)}.cook-step{display:flex;align-items:center;gap:9px;line-height:1.3;font-size:17px}.cook-step .iconify{width:22px;height:22px;flex-shrink:0;color:var(--demo-accent)}.finish-cooking,.unlock-action{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;background:var(--md-primary);color:white;font-size:17px;font-weight:700;padding:12px;margin-top:22px}.finish-cooking .iconify,.unlock-action .iconify{width:21px;height:21px}.finish-cooking.done{background:var(--md-check-surface);color:var(--md-check-content)}.biometric-sheet{position:absolute;inset:auto 0 0;z-index:3;display:flex;align-items:center;flex-direction:column;background:var(--md-surface-container);border-radius:24px 24px 0 0;padding:10px 20px 18px;box-shadow:0 -20px 30px #241b3424}.sheet-grip{width:30px;height:4px;background:var(--md-on-surface-variant);opacity:.4;border-radius:4px;margin-bottom:13px}
.secret-locked{text-align:center;padding:45px 22px}.secret-locked>.iconify{width:42px;height:42px;color:var(--demo-accent);margin-bottom:10px}.secret-locked p{font-size:18px;line-height:1.4;color:var(--md-on-surface-variant);margin:0}.biometric-sheet{min-height:300px;text-align:center}.biometric-sheet h3{font-size:23px;margin:0 0 10px}.biometric-sheet p{font-size:16px;line-height:1.3;margin:0}.fingerprint{position:relative;display:grid;place-items:center;width:76px;height:76px;margin:17px 0 12px;color:var(--demo-accent)}.fingerprint>.iconify{width:52px;height:52px}.fingerprint>.scan-ring{position:absolute;inset:0;border:1px solid currentColor;border-radius:50%;animation:scan-ring 1.8s ease-out infinite}.fingerprint.verified{color:var(--md-check-content)}.fingerprint.verified>.scan-ring{animation:none;background:var(--md-check-surface);z-index:-1}.biometric-sheet>strong{font-size:17px}.biometric-sheet>small{font-size:12px;color:var(--md-on-surface-variant);margin-top:9px}.secret-revealed{padding:22px 12px;display:grid;grid-template-columns:minmax(0,1fr);gap:9px}.secret-revealed h3{font-size:22px;margin-bottom:8px}.secret-revealed :deep(.text-\[1\.25rem\]){font-size:17px}
.feature-controls{display:flex;justify-content:center;gap:7px;margin:12px 0 8px}.feature-controls button{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;cursor:pointer}.feature-controls button>span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--demo-soft);font-size:16px;font-weight:700;line-height:1}.feature-controls button[aria-pressed=true]>span{background:var(--demo-accent);color:white}.feature-demo button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:3px}.feature-demo figcaption{text-align:center;font-size:12px;line-height:1.5;max-width:490px;margin:auto;padding:0 8px;color:var(--md-on-surface-variant)}.sheet-enter-active,.sheet-leave-active{transition:transform .65s cubic-bezier(.2,0,0,1),opacity .4s}.sheet-enter-from,.sheet-leave-to{transform:translateY(100%);opacity:0}.unlock-enter-active{transition:opacity .5s,transform .6s cubic-bezier(.2,0,0,1)}.unlock-enter-from{opacity:0;transform:translateY(12px)}.is-still :deep(*){animation-play-state:paused!important}
@keyframes scan-ring{from{scale:.7;opacity:.6}to{scale:1.25;opacity:0}}@keyframes callout-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@container(max-width:340px){.feature-phone{width:258px}.feature-stage{height:600px}.feature-callout{font-size:14px;padding-inline:12px}.list-overview :deep(.text-\[1\.375rem\]){font-size:18px}.feature-top{font-size:15px}.feature-content h3{font-size:21px}}
@media(prefers-reduced-motion:reduce){.feature-demo :deep(*){animation:none!important;transition:none!important}}
.cook-step{background:var(--md-surface-container);border-radius:8px;overflow:hidden;min-height:48px;gap:10px;margin-top:9px}.cook-step>b{display:grid;place-items:center;align-self:stretch;width:30px;flex-shrink:0;background:var(--demo-soft);font-size:18px}.cook-step>.cook-step__text{flex:1;min-width:0;padding-block:8px;overflow-wrap:anywhere}.cook-step>.iconify{flex:0 0 22px;margin-right:10px}.cook-step.completed{opacity:.6}.cook-step.completed>.cook-step__text{text-decoration:line-through}

.is-still .feature-callout{animation:none;opacity:1;transform:none}
.feature-screen{display:flex;flex-direction:column;height:530px}.feature-content{height:auto;flex:1;min-height:0}.feature-status,.feature-screen>.native-toolbar,.feature-screen>.list-actions,.feature-gesture{flex-shrink:0}.secret-revealed{padding:12px}.secret-revealed h3{margin:0 0 4px}.secret-revealed>small{display:none}.secret-locked{padding-top:75px}
.secret-start{padding:16px 12px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px}.feature-demo[data-feature="secret"] .feature-screen{height:570px}.feature-demo[data-feature="secret"] .feature-stage{height:650px}
</style>

<style scoped>
@container (min-width: 420px) { .feature-phone { width: clamp(310px, 60cqi, 360px); } }
@container(min-width:620px) { .feature-stage { zoom:1.15; } }
@container(min-width:850px) { .feature-stage { zoom:1.4; } }
.secret-revealed h3 { font: var(--demo-list-heading); }
.recipe-content { display: flex; flex-direction: column; }
.recipe-content > .feature-recipe-image { min-height: 0; flex: 0 1 144px; }
.recipe-content > .recipe-copy { flex-shrink: 0; }
</style>
