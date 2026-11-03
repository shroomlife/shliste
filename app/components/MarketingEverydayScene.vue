<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'
import type { EverydaySceneKey } from '~/data/marketingEverydayStories'

const props = defineProps<{
  storyKey: EverydaySceneKey
  moment: 'prepare' | 'together'
}>()
const scenes = {
  'ferienwohnung-einkauf': { title: 'Ankommen & Frühstück', person: 'Alex', buyer: 'Lina', icon: 'i-lucide-luggage', place: 'Schon in der Ferienwohnung', kept: 'Salz', first: 'Brot', second: 'Tomatensoße', added: 'Haferdrink ungesüßt', note: 'Eine Ankunft. Ein Abendessen. Ein Frühstück.', prepare: ['Noor schaut in den Küchenschrank.', 'Salz ist vorhanden. Brot und Soße fehlen.', 'Nur Fehlendes kommt auf den Einkauf.'], together: ['Lina öffnet die gemeinsame Liste.', 'Alex ergänzt den Haferdrink fürs Frühstück.', 'Lina hakt den besorgten Haferdrink ab.'] },
  'raclette-einkauf': { title: 'Raclette am Samstag', person: 'Kim', buyer: 'Jo', icon: 'i-lucide-cooking-pot', place: 'Schon im Kühlschrank', kept: 'Gewürzgurken', first: 'Raclettekäse', second: 'Champignons', added: 'Mais, kleine Dose', note: 'Ein Pfännchen für jede Vorliebe.', prepare: ['Mina prüft, was schon da ist.', 'Die Gewürzgurken bleiben aus dem Einkauf.', 'Käse und Pilze kommen auf die Liste.'], together: ['Jo schaut vor dem Einkauf auf die Liste.', 'Kim ergänzt Mais für ihr Lieblingspfännchen.', 'Jo hat den Mais besorgt und hakt ihn ab.'] },
  'umzug-erster-abend': { title: 'Der erste Abend', person: 'Aylin', buyer: 'Lea', icon: 'i-lucide-package-open', place: 'Schon in der Ankunftstasche', kept: 'Kaffee', first: 'Brot', second: 'Müllbeutel 35 l', added: 'Seife, Spender', note: 'Heute nur das, was bis morgen fehlt.', prepare: ['Aylin öffnet die Tasche für den ersten Abend.', 'Der Kaffee ist schon eingepackt.', 'Brot und Müllbeutel fehlen noch.'], together: ['Lea öffnet die Liste vor dem Einkauf.', 'Aylin ergänzt Seife für das neue Bad.', 'Lea hakt die besorgte Seife ab.'] },
}
const scene = computed(() => scenes[props.storyKey])
const { root, phase, paused, reduced, running, choose } = useMarketingPlayback(3, 4400)
const { style, next } = useMarketingDemoPalette()
watch(phase, (current, previous) => {
  if (current === 0 && previous === 2 && running.value)
    next()
})
const narration = computed(() => scene.value[props.moment][phase.value])
function item(name: string, checked = false): ListItem {
  return { id: name, listId: 'marketing-example', name, quantity: 1, checked, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '2026-11-03T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z', deletedAt: null, fieldTimestamps: null }
}
</script>

<template>
  <figure
    ref="root"
    class="everyday-scene"
    :class="[{ 'scene-paused': !running }, `moment-${moment}`]"
    :style="style"
    :data-scenario="storyKey"
    :data-phase="phase"
  >
    <div class="mini-scene-heading">
      <span class="mini-scene-icon"><UIcon :name="scene.icon" /></span><div><span class="mkt-label">{{ moment === 'prepare' ? 'Erst nachsehen' : 'Zusammen einkaufen' }}</span><h3>{{ moment === 'prepare' ? 'Das braucht keinen zweiten Einkauf.' : 'Eine Ergänzung kommt an.' }}</h3></div>
    </div>
    <div
      class="mini-scene-stage"
      aria-hidden="true"
      inert
    >
      <template v-if="moment === 'prepare'">
        <div class="pantry-card">
          <span>{{ scene.place }}</span><div class="pantry-object">
            <UIcon :name="scene.icon" />
          </div><strong>{{ scene.kept }}</strong><div
            class="pantry-confirm"
            :class="{ confirmed: phase > 0 }"
          >
            <UIcon name="i-lucide-check" />{{ phase > 0 ? 'Ist schon da.' : 'Kurz nachsehen.' }}
          </div><p>{{ scene.note }}</p>
        </div>
        <div class="list-excerpt">
          <MarketingAppToolbar /><div class="excerpt-content">
            <span class="excerpt-label">Ausschnitt aus der Einkaufsliste</span><h4>{{ scene.title }}</h4><div class="row-space">
              <Transition name="arriving-row">
                <ListItemRow
                  v-if="phase > 0"
                  :item="item(scene.first)"
                />
              </Transition>
            </div><div class="row-space">
              <Transition name="arriving-row">
                <ListItemRow
                  v-if="phase > 1"
                  :item="item(scene.second)"
                />
              </Transition>
            </div><div class="excerpt-bottom">
              <UIcon name="i-lucide-shopping-basket" />{{ phase === 2 ? 'Zwei Dinge fehlen noch.' : 'Platz für das, was fehlt.' }}
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="people-story">
          <div class="person-card">
            <span class="person-initial">{{ scene.person[0] }}</span><div><strong>{{ scene.person }}</strong><small>{{ storyKey === 'ferienwohnung-einkauf' ? 'Kommt später dazu' : 'Ergänzt von zu Hause' }}</small></div>
          </div><div class="message-space">
            <Transition
              name="arriving-row"
              mode="out-in"
            >
              <p
                :key="phase"
                class="person-message"
              >
                {{ phase === 0 ? 'Mir fällt noch etwas ein.' : phase === 1 ? `Bitte noch: ${scene.added}.` : 'Danke fürs Mitbringen!' }}
              </p>
            </Transition>
          </div><div class="connection-line">
            <i :class="{ transmitting: phase === 1 }" /><UIcon name="i-lucide-wifi" /><span>Mit Anmeldung &amp; Internet</span>
          </div><div class="person-card buyer">
            <span class="person-initial">{{ scene.buyer[0] }}</span><div><strong>{{ scene.buyer }}</strong><small>Übernimmt den Einkauf</small></div>
          </div>
        </div>
        <MarketingScenePhone
          :title="scene.title"
          input
          shared
          :value="''"
        >
          <p class="phone-owner">
            {{ scene.buyer }}s Ansicht
          </p><div class="actual-rows">
            <ListItemRow :item="item(scene.first)" /><ListItemRow :item="item(scene.second)" /><div class="row-space">
              <Transition name="arriving-row">
                <ListItemRow
                  v-if="phase > 0"
                  :item="item(scene.added, phase === 2)"
                  :just-changed="phase === 1"
                  :changed-by="scene.person"
                />
              </Transition>
            </div>
          </div><div
            class="sync-result"
            :class="{ done: phase === 2 }"
          >
            <UIcon :name="phase === 2 ? 'i-lucide-check-check' : 'i-lucide-users'" />{{ phase === 2 ? 'Besorgt. Nach dem Abgleich für beide sichtbar.' : 'Dieselbe Liste auf euren Geräten.' }}
          </div>
        </MarketingScenePhone>
      </template>
    </div>
    <div class="mini-scene-narration">
      <span class="narration-number">{{ phase + 1 }}<small>/ 3</small></span><p>{{ narration }}</p>
    </div>
    <div class="mini-scene-controls">
      <button
        type="button"
        aria-label="Vorheriger Animationsschritt"
        @click="choose((phase + 2) % 3)"
      >
        <UIcon name="i-lucide-chevron-left" />
      </button><button
        type="button"
        :disabled="reduced"
        :aria-label="paused ? 'Animation fortsetzen' : 'Animation pausieren'"
        @click="paused = !paused"
      >
        <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
      </button><button
        type="button"
        aria-label="Nächster Animationsschritt"
        @click="choose((phase + 1) % 3)"
      >
        <UIcon name="i-lucide-chevron-right" />
      </button><span>{{ reduced ? 'Schrittweise ansehen' : paused ? 'Pausiert' : 'Kurze Geschichte in drei Schritten' }}</span>
    </div>
    <figcaption>Animiertes Beispiel mit fiktiven Personen und App-Komponenten. {{ moment === 'prepare' ? 'Vorhandene Dinge prüfst du selbst.' : 'Der gemeinsame Stand braucht eine angenommene Einladung, Anmeldung und Internet.' }}</figcaption>
  </figure>
</template>

<style scoped>
.everyday-scene{container-type:inline-size;margin:24px 0 0;border:1px solid color-mix(in srgb,var(--demo-accent) 16%,transparent);border-radius:26px;background:var(--demo-canvas);overflow:hidden;color:var(--md-on-surface);grid-column:1/-1;min-width:0;scroll-margin-top:110px}.mini-scene-heading{display:flex;gap:13px;align-items:center;padding:26px 24px 10px}.mini-scene-icon{display:grid;place-items:center;width:45px;height:45px;flex-shrink:0;border-radius:15px;background:var(--md-surface);color:var(--demo-accent)}.mini-scene-icon>.iconify{width:24px;height:24px}.mini-scene-heading .mkt-label{font-size:10px;letter-spacing:.08em}.mini-scene-heading h3{font-size:23px;line-height:1.16;margin-top:6px;font-weight:800;letter-spacing:-.025em}.mini-scene-stage{position:relative;display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr);gap:24px;align-items:center;padding:24px}.pantry-card{padding:23px 18px;background:var(--md-surface);border-radius:20px;text-align:center;box-shadow:0 12px 28px -24px #3e223855}.pantry-card>span{display:block;font-size:13px;line-height:1.4;color:var(--md-on-surface-variant)}.pantry-object{display:grid;place-items:center;width:76px;height:76px;border-radius:24px;background:var(--demo-soft);color:var(--demo-accent);margin:23px auto 16px}.pantry-object>.iconify{width:39px;height:39px}.pantry-card>strong{font-size:24px;font-weight:800;overflow-wrap:anywhere}.pantry-confirm{display:flex;justify-content:center;gap:5px;align-items:center;font-size:13px;margin-top:12px;min-height:30px;color:var(--md-on-surface-variant)}.pantry-confirm.confirmed{color:var(--md-check-content)}.pantry-card p{font-size:14px;line-height:1.5;margin-top:18px}.list-excerpt{border-radius:22px;overflow:hidden;border:1px solid #93818c33;background:var(--md-surface);box-shadow:0 14px 32px -25px #49233c66;min-width:0}.excerpt-content{padding:18px 12px}.excerpt-label{font-size:10px;color:var(--md-on-surface-variant)}.excerpt-content h4{font-size:24px;line-height:1.15;font-weight:800;margin:10px 0 20px}.row-space{min-height:76px}.list-excerpt :deep(.min-h-15){height:60px;min-height:60px}.list-excerpt :deep(.text-\[1\.25rem\]){font-size:16px}.excerpt-bottom{display:flex;gap:8px;align-items:center;font-size:12px;line-height:1.4;min-height:40px;color:var(--demo-accent);margin-top:12px}.excerpt-bottom>.iconify{width:20px;height:20px;flex-shrink:0}.people-story{min-width:0}.person-card{display:flex;align-items:center;gap:10px}.person-initial{width:44px;height:44px;flex:0 0 44px;border-radius:50%;display:grid;place-items:center;background:var(--demo-accent);color:white;font-size:21px;line-height:1}.person-card strong{display:block;font-size:23px;font-weight:800}.person-card small{display:block;font-size:12px;line-height:1.5;margin-top:4px;color:var(--md-on-surface-variant)}.buyer .person-initial{background:var(--md-check-content)}.message-space{height:130px;padding-top:20px}.person-message{padding:18px;background:var(--md-surface);border-radius:2px 20px 20px 20px;font-size:19px;line-height:1.45;margin:0}.connection-line{position:relative;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:24px 0 30px;color:var(--demo-accent);font-size:11px}.connection-line>.iconify{width:17px;height:17px}.connection-line i{position:absolute;top:5px;left:0;height:2px;width:100%;background:var(--demo-soft);overflow:hidden}.connection-line i.transmitting:after{content:'';position:absolute;width:35%;height:100%;background:var(--demo-accent);animation:send-light 1.2s ease-in-out infinite}.phone-owner{font-size:12px;color:var(--md-on-surface-variant);margin:0 0 16px}.actual-rows{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.sync-result{display:flex;align-items:center;gap:8px;font-size:13px;line-height:1.45;margin-top:24px;min-height:55px;color:var(--md-on-surface-variant)}.sync-result>.iconify{width:22px;height:22px;flex-shrink:0}.sync-result.done{color:var(--md-check-content)}.mini-scene-narration{display:flex;gap:16px;align-items:center;background:var(--md-surface);padding:22px 24px;min-height:110px}.narration-number{display:flex;align-items:baseline;gap:4px;flex-shrink:0;font-size:25px;font-weight:800;color:var(--demo-accent);font-variant-numeric:tabular-nums}.narration-number small{font-size:12px;font-weight:500}.mini-scene-narration p{font-size:18px;line-height:1.5;margin:0}.mini-scene-controls{display:flex;align-items:center;gap:8px;padding:16px 24px 0}.mini-scene-controls button{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:50%;background:var(--md-surface);color:var(--demo-accent);cursor:pointer}.mini-scene-controls button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:3px}.mini-scene-controls button:disabled{opacity:.5;cursor:default}.mini-scene-controls .iconify{width:19px;height:19px}.mini-scene-controls>span{font-size:12px;line-height:1.4;margin-left:5px;color:var(--md-on-surface-variant)}.everyday-scene figcaption{padding:15px 24px 23px;font-size:12px;line-height:1.6;color:var(--md-on-surface-variant)}.arriving-row-enter-active,.arriving-row-leave-active{transition:opacity .3s,transform .45s cubic-bezier(.2,.8,.2,1)}.arriving-row-enter-from{opacity:0;transform:translateY(10px)}.arriving-row-leave-to{opacity:0;transform:translateY(-6px)}.scene-paused :deep(*){animation-play-state:paused!important}@keyframes send-light{from{transform:translateX(-100%)}to{transform:translateX(400%)}}
@container(max-width:570px){.mini-scene-stage{grid-template-columns:1fr;padding:20px 16px;gap:22px}.pantry-card{display:grid;grid-template-columns:65px 1fr;text-align:left;column-gap:16px;padding:18px}.pantry-object{grid-column:1;grid-row:1/4;width:60px;height:60px;margin:0;align-self:center}.pantry-card>span,.pantry-card>strong,.pantry-confirm{grid-column:2}.pantry-card>strong{font-size:22px;margin-top:6px}.pantry-confirm{justify-content:flex-start;margin-top:4px}.pantry-card p{grid-column:1/-1;margin-top:12px;font-size:13px}.list-excerpt{width:100%;max-width:330px;justify-self:center}.people-story{width:100%;max-width:330px;justify-self:center;display:grid;grid-template-columns:1fr 1fr;gap:14px}.person-card{gap:8px;align-items:flex-start}.person-initial{width:34px;height:34px;flex-basis:34px;font-size:17px}.person-card strong{font-size:19px}.person-card small{font-size:11px}.buyer{grid-column:2;grid-row:1}.message-space{grid-row:2;grid-column:1/-1;height:95px;padding-top:0}.person-message{font-size:17px;padding:14px 18px;min-height:74px}.connection-line{grid-column:1/-1;padding:8px 0 0}.connection-line i{top:0}.mini-scene-heading{padding:22px 18px 8px}.mini-scene-heading h3{font-size:21px}.mini-scene-narration{padding:18px;min-height:125px;gap:12px}.mini-scene-narration p{font-size:17px}.mini-scene-controls{padding-inline:18px}.mini-scene-controls>span{font-size:11px}.everyday-scene figcaption{padding-inline:18px}}
@media(prefers-reduced-motion:reduce){.everyday-scene :deep(*){animation:none!important;transition:none!important}}
</style>

<style scoped>
.mini-scene-stage>*{min-width:0}.people-story>*,.person-card>div{min-width:0}.moment-together :deep(.scene-screen){height:690px}
@container(max-width:570px){.mini-scene-stage{grid-template-columns:minmax(0,1fr)}.people-story{grid-template-columns:repeat(2,minmax(0,1fr))}.person-card small{overflow-wrap:anywhere}}
@container(max-width:340px){.mini-scene-stage{padding-inline:10px}.moment-together .mini-scene-stage{padding-inline:8px}.mini-scene-stage :deep(.scene-phone-content>h3){font-size:21px}.mini-scene-stage :deep(.scene-phone-content .text-\[1\.25rem\]){font-size:16px}.mini-scene-stage :deep(.entry-field){font-size:16px}.person-initial{width:29px;height:29px;flex-basis:29px}.person-card{gap:6px}.person-card strong{font-size:17px}}
</style>
