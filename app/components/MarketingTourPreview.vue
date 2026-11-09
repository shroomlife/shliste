<script setup lang="ts">
import type { List, ListItem } from '#shared/types/domain'
import { marketingPalettes } from '~/utils/marketingPalette'

withDefaults(defineProps<{ overview?: boolean, shared?: boolean }>(), { overview: false, shared: false })
const { style, palette } = useMarketingPalette()
const stamp = '2026-11-03T12:00:00.000Z'
const base = { createdAt: stamp, updatedAt: stamp, deletedAt: null, fieldTimestamps: null }
const lists = computed<List[]>(() => [
  { ...base, id: 'tour-friday', name: 'Freitag mit Freunden', color: marketingPalettes[palette.value]!.primary, secret: false, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null },
  { ...base, id: 'tour-week', name: 'Für die Woche', color: '#94A97F', secret: false, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null },
  { ...base, id: 'tour-secret', name: 'Sams Überraschung', color: '#B796D5', secret: true, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null },
])
const items: ListItem[] = ['Tomaten', 'Rucola', 'Lasagneblätter'].map((name, index) => ({ ...base, id: `tour-${index}`, listId: 'tour-friday', name, quantity: 1, checked: false, removed: false, orderIndex: index, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null }))
</script>

<template>
  <figure
    class="tour-preview"
    :style="style"
  >
    <div
      class="tour-stage"
      aria-hidden="true"
      inert
    >
      <MarketingScenePhone
        :detail="overview ? 'overview' : 'list'"
        :input="!overview"
        :shared="shared"
        :title="overview ? '' : 'Freitag mit Freunden'"
        :value="overview ? '' : 'Olivenöl'"
      >
        <template v-if="overview">
          <div class="tour-cards">
            <ListCard
              v-for="(list, i) in lists"
              :key="list.id"
              :list="list"
              :open-count="i === 0 ? 3 : 4"
              :is-shared="i === 0"
            />
          </div><div class="tour-fabs">
            <span><i class="tour-image-icon" /></span><span><i class="tour-voice-icon" /></span><span><UIcon name="i-lucide-plus" />Liste</span>
          </div>
        </template><div
          v-else
          class="tour-items"
        >
          <ListItemRow
            v-for="item in items"
            :key="item.id"
            :item="item"
          />
        </div>
      </MarketingScenePhone>
    </div>
    <figcaption>Beispieldaten</figcaption>
  </figure>
</template>

<style scoped>
.tour-preview{width:100%;max-width:440px;margin:0 auto;min-width:0}.tour-stage{padding:24px;border-radius:32px;background:var(--demo-soft);display:grid;place-items:center}.tour-stage :deep(.scene-phone){width:320px}.tour-stage :deep(.scene-screen){height:560px}.tour-stage :deep(.scene-phone-content){display:flex;flex-direction:column}.tour-cards{display:grid;gap:12px}.tour-cards :deep(a){min-height:80px;padding:12px;gap:6px}.tour-items{display:grid;gap:10px}.tour-fabs{display:flex;gap:10px;justify-content:flex-end;margin-top:auto;padding-top:20px}.tour-fabs>span{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:16px;background:var(--md-secondary-container);color:var(--md-on-surface);flex-shrink:0}.tour-fabs>span:last-child{width:auto;padding:0 16px;gap:8px;background:var(--md-primary);color:var(--md-on-primary);font-size:19px}.tour-fabs .iconify,.tour-fabs i{display:block;width:24px;height:24px}.tour-fabs i{background:currentColor}.tour-image-icon{mask:url('/images/brand/android-ai-image.svg') center/contain no-repeat}.tour-voice-icon{mask:url('/images/brand/android-ai-voice.svg') center/contain no-repeat}.tour-preview figcaption{font-size:17px;line-height:1.45;text-align:center;margin:16px auto 0;max-width:360px;color:var(--md-on-surface-variant)}.tour-preview figcaption small{display:block;font-size:12px;line-height:1.5;margin-top:7px}
@media(max-width:440px){.tour-stage{padding:14px;border-radius:24px}.tour-fabs{gap:8px}.tour-fabs>span{width:48px;height:48px}.tour-fabs>span:last-child{padding:0 12px}.tour-stage :deep(.scene-phone-content){padding-inline:10px}.tour-preview figcaption{font-size:16px}}
</style>

<style scoped>
.tour-preview { max-width:36rem; container-type:inline-size; }
@container(min-width:500px) { .tour-stage { zoom:1.25; } }
@container(min-width:700px) { .tour-stage { zoom:1.6; } }
</style>
