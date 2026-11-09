<script setup lang="ts">
import { holidayListScroll } from '~/utils/marketingListScroll'
import type { ListItem } from '#shared/types/domain'
import type { marketingHeroWorlds } from '~/data/marketingHeroWorlds'

const props = defineProps<{ world: typeof marketingHeroWorlds[number], index: number, moment: number, time: number }>()
const holiday = ['Brötchen', 'Kaffee', 'Kaffeefilter', 'Haferdrink', 'Marmelade', 'Tomatensauce', 'Paprika', 'Veganer Reibegenuss', 'Spülmittel', 'Müllbeutel', 'Küchenrolle', 'Wasser']
const rows = computed(() => props.index === 1 ? ['Kaffee', 'Haferdrink', 'Spülmittel'] : props.index === 2 ? holiday : props.index === 3 ? props.moment >= 4 ? ['Wasser', 'Brötchen', 'Hummus'] : props.moment >= 3 ? ['Wasser', 'Brötchen'] : [] : ['Konzertkarten', 'Vegane Schokolade', 'Geburtstagskarte'])
const title = computed(() => props.index === 3 ? 'Erster Abend' : props.world.lists[0])
const checked = (i: number) => props.index === 1 ? i < props.moment - 1 : props.index === 2 ? i === 10 && props.moment >= 4 : props.index === 4 ? i === 0 && props.moment >= 4 : false
function item(name: string, i: number): ListItem {
  return { id: name, listId: 'hero-everyday', name, checked: checked(i), quantity: 1, removed: false, orderIndex: i, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '', updatedAt: '', deletedAt: null, fieldTimestamps: null }
}
const holidayMotion = computed(() => holidayListScroll(props.time))
const naming = computed(() => props.index === 3 && props.moment <= 2)
const locked = computed(() => props.index === 4 && props.moment < 3)
</script>

<template>
  <div
    class="everyday-screen"
    :class="{ 'everyday-screen--naming': naming }"
    :data-story="index"
    :data-step="moment"
  >
    <MarketingListActions
      v-if="index === 5 || locked"
      :shared="index === 1 || index === 2"
      :recipe="index === 5"
    />
    <template v-if="index === 5">
      <div class="cooking-story">
        <img
          :src="world.image"
          alt=""
          width="600"
          height="300"
        ><h3>{{ world.recipe }}</h3><small>Die letzten zwei Kochschritte</small><div
          class="cook-row"
          :class="{ done: moment >= 2 }"
        >
          <b>3</b><span>Teig in die Form geben</span><i><UIcon :name="moment >= 2 ? 'i-lucide-undo-2' : 'i-lucide-check'" /></i>
        </div><div
          class="cook-row"
          :class="{ done: moment >= 3 }"
        >
          <b>4</b><span>Goldbraun backen</span><i><UIcon :name="moment >= 3 ? 'i-lucide-undo-2' : 'i-lucide-check'" /></i>
        </div>
        <Transition name="scene-reveal">
          <MarketingBadgeMoment
            v-if="moment >= 4"
            :name="world.recipe"
            :image="world.image"
            date="01.11.2026"
            :collection="moment === 5"
          />
        </Transition>
      </div>
    </template>
    <template v-else-if="locked">
      <div class="locked-story">
        <UIcon name="i-lucide-lock-keyhole" /><h3>{{ title }}</h3><p>Diese Liste ist geschützt.</p><Transition name="scene-reveal">
          <div
            v-if="moment === 2"
            class="unlock-dialog"
          >
            <UIcon name="i-lucide-fingerprint" /><strong>Liste entsperren</strong><span>Mit Biometrie oder Displaysperre bestätigen</span><small>Android-Systemdialog · nachgestellt</small>
          </div>
        </Transition>
      </div>
    </template>
    <template v-else-if="naming">
      <div class="new-list-story">
        <i class="new-list-handle" /><div class="new-list-heading">
          <h3>Neue Liste</h3><MarketingSecretSwitch />
        </div><label>Name der Liste</label><div class="name-field">
          {{ moment === 2 ? 'Erster Abend' : '' }}<i />
        </div><span class="create-action">Speichern</span>
      </div>
    </template>
    <template v-else>
      <MarketingNativeListViewport
        :title="title"
        :count="rows.length"
        :shared="index === 1 || index === 2"
        :secret="index === 4"
        :progress="index === 2 ? holidayMotion.progress : 0"
        :return-cue="index === 2 && holidayMotion.returnCue"
        :return-cue-progress="holidayMotion.returnCueProgress"
      >
        <ListItemRow
          v-for="(name, i) in rows"
          :key="name"
          :item="item(name, i)"
        />
      </MarketingNativeListViewport>
    </template>
  </div>
</template>

<style scoped>
.everyday-screen{position:absolute;inset:0;background:var(--md-surface);display:flex;flex-direction:column;overflow:hidden}.everyday-screen>.list-actions{flex-shrink:0}.cooking-story h3,.new-list-story h3{font-size:25px;line-height:1.1;font-weight:800;margin:0 0 6px}
.cooking-story{padding:12px;position:relative;flex:1;min-height:0}.cooking-story>img{width:100%;height:115px;object-fit:cover;border-radius:12px;margin-bottom:12px}.cooking-story>small{font-size:12px;color:var(--md-on-surface-variant)}.cook-row{display:flex;align-items:center;min-height:52px;gap:8px;margin-top:10px;background:var(--md-surface-container);border-radius:8px;overflow:hidden;font-size:16px}.cook-row>b{width:25px;text-align:center}.cook-row>span{flex:1}.cook-row>i{width:52px;height:52px;display:grid;place-items:center;background:var(--md-check-surface);color:var(--md-check-content);flex-shrink:0}.cook-row .iconify{width:20px;height:20px}.cook-row.done>span{opacity:.5}.cook-row.done>i{background:var(--md-undo-surface);color:var(--md-undo-content)}
.locked-story,.new-list-story{padding:32px 18px;text-align:center;position:relative;flex:1}.locked-story>.iconify,.new-list-story>.iconify{width:38px;height:38px;color:var(--demo-accent);margin-bottom:18px}.locked-story h3{font:var(--demo-list-heading);margin:0 0 6px}.locked-story p{font-size:16px}.unlock-dialog{position:absolute;inset:60px 12px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border:1px solid var(--md-outline-variant);border-radius:24px;padding:18px;background:var(--md-surface-container);box-shadow:0 10px 25px #25152522}.unlock-dialog>.iconify{width:55px;height:55px;color:var(--demo-accent)}.unlock-dialog strong{font-size:24px}.unlock-dialog span{font-size:16px;line-height:1.35}.unlock-dialog small{font-size:11px}.new-list-story label{display:block;text-align:left;font-size:14px;margin:24px 0 8px}.name-field{min-height:52px;padding:12px;border:2px solid var(--demo-accent);border-radius:10px;text-align:left;font-size:21px}.name-field>i{display:inline-block;vertical-align:middle;width:2px;height:20px;background:var(--demo-accent);margin-left:2px}.create-action{display:block;margin-top:16px;padding:12px;border-radius:12px;background:var(--md-primary);color:var(--md-on-primary);font-weight:700;font-size:18px}.new-list-story p{font-size:14px;line-height:1.4;color:var(--md-on-surface-variant)}.scene-reveal-enter-active,.scene-reveal-leave-active{transition:opacity .45s,transform .6s cubic-bezier(.22,1,.36,1)}.scene-reveal-enter-from,.scene-reveal-leave-to{opacity:0;transform:translateY(20px) scale(.96)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<style scoped>
.new-list-story{flex:initial;text-align:left;margin-top:auto;background:var(--md-surface-container);border-radius:24px 24px 0 0;padding:16px 18px 28px;box-shadow:0 -4px 18px #2219251c}.everyday-screen--naming {
  background: rgb(28 20 28 / 18%);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.new-list-handle{display:block;width:30px;height:4px;background:var(--md-outline-variant);border-radius:4px;margin:0 auto 24px}.new-list-story .create-action{text-align:center}.new-list-story p{margin:16px 0 0}
.everyday-rows :deep(.list-item-row > .list-item-action){width:48px;min-width:48px;height:48px;flex:0 0 48px;padding:0}.everyday-rows :deep(.list-item-action .iconify){width:22px;height:22px}
.new-list-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:40px}.new-list-heading>h3{margin:0;line-height:32px}
</style>
