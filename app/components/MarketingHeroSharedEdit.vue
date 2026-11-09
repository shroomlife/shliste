<script setup lang="ts">
import type { marketingHeroFrame } from '~/utils/marketingHeroTimeline'
import type { marketingHeroWorlds } from '~/data/marketingHeroWorlds'
import type { ListItem } from '#shared/types/domain'

const props = defineProps<{ frame: ReturnType<typeof marketingHeroFrame>, world: typeof marketingHeroWorlds[number] }>()
function row(name: string): ListItem {
  return { id: name, listId: 'hero-shared', name, quantity: 1, checked: false, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '', updatedAt: '', deletedAt: null, fieldTimestamps: null }
}
const rows = computed(() => ['Lasagneplatten', 'Passierte Tomaten', ...(props.frame.applied ? props.world.items : [])])
// Android scrolls after local additions, while contributions from another person stay put.
// Follow the Hero clock so seeking, pausing and reduced motion keep one deterministic frame.
const scrollProgress = computed(() => {
  if (!props.frame.applied) return 0
  const progress = Math.max(0, Math.min(1, (props.frame.t - 18500) / 1500))
  return progress * progress * (3 - 2 * progress)
})
</script>

<template>
  <div class="shared-edit-scene">
    <MarketingNativeListViewport
      :title="world.lists[0]"
      :count="rows.length"
      shared
      :progress="scrollProgress"
    >
      <ListItemRow
        v-for="name in rows"
        :key="name"
        :item="row(name)"
      />
      <template #after-card>
        <div
          v-if="!frame.applied"
          class="ai-entry"
          :class="{ selected: frame.moment === 2 }"
        >
          <span>AI Features <UIcon name="i-lucide-chevron-up" /></span><strong><UIcon name="i-lucide-sparkles" />AI-Bearbeitung</strong>
        </div>
      </template>
    </MarketingNativeListViewport>
    <Transition name="edit-sheet">
      <div
        v-if="frame.editing"
        class="edit-scrim"
      >
        <div class="edit-sheet">
          <i class="sheet-handle" /><h4>{{ frame.preview ? 'Vorschau' : 'AI-Bearbeitung' }}</h4><p>{{ frame.preview ? 'Wähle aus, was übernommen werden soll' : 'Beschreibe deine Änderungen' }}</p>
          <template v-if="frame.preview">
            <div class="diff-summary">
              <b>+3</b><span>3/3 Änderungen</span>
            </div><div
              v-for="name in world.items"
              :key="name"
              class="diff-row"
            >
              <b>+</b><span>{{ name }}</span><i><UIcon name="i-lucide-check" /></i>
            </div><small>Lasagneplatten und passierte Tomaten bleiben.</small><div class="sheet-actions">
              <span>Verwerfen</span><b>Übernehmen (3)</b>
            </div>
          </template>
          <div
            v-else-if="frame.processing"
            class="edit-loading"
          >
            <UIcon
              name="i-lucide-loader-circle"
              :style="{ transform: `rotate(${frame.t * .2}deg)` }"
            /><strong>Änderungen vorbereiten</strong><span>Gleich kannst du sie prüfen.</span>
          </div>
          <template v-else>
            <div class="native-edit-input">
              <span>Beschreibe deine Änderungen</span><b :class="{ recording: frame.recording }"><span
                v-if="frame.recording"
                class="edit-wave"
              ><i
                v-for="(height, i) in frame.wave"
                :key="i"
                :style="{ height: `${height}px` }"
              /></span><i
                v-else
                class="edit-mic"
              /><span
                v-if="frame.recording"
                class="edit-timer"
              >00:0{{ frame.seconds }} <UIcon name="i-lucide-trash-2" /></span></b>
            </div>
          </template>
        </div>
      </div>
    </Transition>
    <div
      v-if="frame.applied"
      class="shared-status-slot"
    >
      <div class="shared-sync">
        <UIcon :name="frame.synced ? 'i-lucide-check-check' : 'i-lucide-check'" /><span>{{ frame.synced ? 'Mit Sam abgeglichen' : 'Drei Ergänzungen übernommen' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shared-edit-scene{position:absolute;inset:0;background:var(--md-surface);overflow:hidden}.ai-entry{margin-top:12px;font-size:14px}.ai-entry>span,.ai-entry>strong{display:flex;align-items:center;gap:7px}.ai-entry>span{justify-content:space-between;color:var(--demo-accent)}.ai-entry>strong{margin-top:8px;padding:10px;border-radius:10px;background:var(--md-secondary-container)}.ai-entry .iconify{width:18px;height:18px}.selected>strong{box-shadow:0 0 0 2px var(--demo-accent)}
.edit-scrim{position:absolute;inset:0;background:#22192545;display:flex;align-items:flex-end}.edit-sheet{width:100%;border-radius:22px 22px 0 0;background:var(--md-surface);padding:10px 16px 18px;box-shadow:0 -8px 25px #22192515}.sheet-handle{display:block;width:30px;height:4px;border-radius:4px;background:var(--md-outline-variant);margin:0 auto 13px}.edit-sheet h4{font-size:25px;line-height:1.1;margin:0 0 5px;font-weight:800}.edit-sheet>p{font-size:13px;line-height:1.4;margin:0 0 14px;color:var(--md-on-surface-variant)}.edit-prompt{border:1px solid var(--md-outline-variant);border-radius:10px;padding:12px;min-height:82px;font-size:16px;color:var(--md-on-surface-variant)}.record-state{min-height:34px;display:flex;align-items:center;font-size:13px}.sheet-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;font-size:14px}.sheet-actions>b{background:var(--md-primary);color:var(--md-on-primary);border-radius:12px;padding:10px 12px}.sheet-actions>span{display:flex;gap:7px;align-items:center}.sheet-actions .iconify{width:19px;height:19px}.sheet-actions>.record-button{width:44px;height:44px;display:grid;place-items:center;background:var(--md-secondary-container);color:var(--md-on-surface)}.sheet-actions>.recording{background:#EF5350;color:white}.edit-loading{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:16px}.edit-loading>.iconify{width:32px;height:32px;color:var(--demo-accent)}.edit-loading>span{font-size:13px}.diff-summary{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:9px}.diff-summary b{background:#EFFAF5;color:#2D9C74;padding:4px 10px;border-radius:20px}.diff-row{display:flex;align-items:center;min-height:42px;border-radius:8px;overflow:hidden;background:#EFFAF5;color:#27272A;margin-bottom:6px;font-size:16px}.diff-row>b{align-self:stretch;display:grid;place-items:center;width:30px;background:#2D9C74;color:white}.diff-row>span{flex:1;padding-left:10px}.diff-row>i{display:grid;place-items:center;width:18px;height:18px;border-radius:3px;background:var(--md-primary);color:white;margin-right:10px}.diff-row .iconify{width:14px;height:14px}.edit-sheet>small{display:block;font-size:12px;line-height:1.35;margin-top:10px}.shared-sync{position:absolute;bottom:8px;left:12px;right:12px;padding:10px;border-radius:10px;background:var(--md-secondary-container);display:flex;align-items:center;gap:7px;font-size:14px;font-weight:700}.shared-sync .iconify{width:20px;height:20px}.edit-sheet-enter-active,.edit-sheet-leave-active{transition:opacity .35s}.edit-sheet-enter-active .edit-sheet,.edit-sheet-leave-active .edit-sheet{transition:transform .55s cubic-bezier(.22,1,.36,1)}.edit-sheet-enter-from,.edit-sheet-leave-to{opacity:0}.edit-sheet-enter-from .edit-sheet,.edit-sheet-leave-to .edit-sheet{transform:translateY(100%)}.sync-note-enter-active{transition:opacity .4s,transform .5s}.sync-note-enter-from{opacity:0;transform:translateY(10px)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<style scoped>
/* The confirmation has its own row. It can never cover the list or AI controls. */
.shared-edit-scene{display:flex;flex-direction:column}.shared-status-slot{flex-shrink:0;padding:12px}.shared-status-slot>.shared-sync{position:static;min-height:44px;padding:12px;gap:8px;line-height:20px;margin:0}.shared-sync>span{display:block;line-height:20px}.shared-sync>.iconify{flex:0 0 20px;width:20px;height:20px}
</style>

<style scoped>
.edit-sheet h4,.edit-sheet>p{text-align:center}.native-edit-input{display:flex;align-items:flex-end;gap:8px;border-radius:24px;background:var(--md-surface-container-high);padding:8px 8px 8px 16px;margin-top:22px}.native-edit-input>span{flex:1;padding:8px 0;font-size:17px;line-height:1.3;opacity:.4}.native-edit-input>b{position:relative;display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:50%;background:var(--md-secondary-container)}.native-edit-input>b.recording{background:#EF5350;color:white}.edit-mic{width:22px;height:22px;background:currentColor;mask:url('/images/brand/android-ai-voice.svg') center/contain no-repeat}.edit-wave{display:flex;align-items:center;gap:3px;height:24px}.edit-wave>i{width:3px;border-radius:3px;background:currentColor}.edit-timer{position:absolute;bottom:50px;right:-2px;display:flex;align-items:center;gap:8px;background:var(--md-surface);color:var(--md-on-surface);box-shadow:0 2px 5px #22192522;border-radius:8px;padding:6px 9px;font-size:12px;font-weight:500;white-space:nowrap}.edit-timer .iconify{width:16px;height:16px}
</style>
