<script setup lang="ts">
import { isListTitleClipped } from '~/utils/marketingListScroll'

const props = withDefaults(defineProps<{
  title: string
  count: number
  shared?: boolean
  shareable?: boolean
  secret?: boolean
  progress?: number
  returnCue?: boolean
  returnCueProgress?: number
}>(), { shared: false, shareable: undefined, secret: false, progress: 0, returnCue: false, returnCueProgress: 0.35 })

const viewport = ref<HTMLElement>()
const content = ref<HTMLElement>()
const card = ref<HTMLElement>()
const heading = ref<HTMLElement>()
const scrollPosition = ref(0)
const maxScroll = ref(0)
const headerTop = ref(12)
const headerHeight = ref(0)
const viewportHeight = ref(0)
const collapsed = computed(() => viewportHeight.value > 0 && isListTitleClipped(scrollPosition.value, headerTop.value, headerHeight.value, viewportHeight.value))
let observer: ResizeObserver | undefined

function applyScroll() {
  if (!viewport.value) return
  viewport.value.scrollTop = Math.max(0, Math.min(1, props.progress)) * maxScroll.value
  scrollPosition.value = viewport.value.scrollTop
}

function measure() {
  if (!viewport.value || !content.value || !heading.value || !card.value) return
  viewportHeight.value = viewport.value.clientHeight
  headerTop.value = card.value.offsetTop
  headerHeight.value = heading.value.offsetHeight
  maxScroll.value = Math.max(0, content.value.scrollHeight - viewport.value.clientHeight)
  applyScroll()
}

watch(() => props.progress, applyScroll, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(measure)
  for (const element of [viewport.value, content.value, heading.value]) if (element) observer.observe(element)
  measure()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    class="native-list-detail"
    :data-collapsed="collapsed"
    :data-scroll="scrollPosition.toFixed(2)"
    :data-max-scroll="maxScroll"
  >
    <MarketingListActions
      :shared="shareable ?? shared"
      :title="title"
      :collapsed="collapsed"
      :return-cue="returnCue"
      :return-cue-progress="returnCueProgress"
    />
    <div
      ref="viewport"
      class="native-list-viewport"
    >
      <div
        ref="content"
        class="native-list-content"
      >
        <div
          ref="card"
          class="native-detail-card"
        >
          <div
            ref="heading"
            class="native-detail-heading"
          >
            <div class="native-detail-title">
              <h3>{{ title }}</h3><i
                v-if="secret"
                class="native-detail-lock"
              />
            </div>
            <div class="native-detail-meta">
              <span>{{ count }} {{ count === 1 ? 'Eintrag' : 'Einträge' }}</span><span
                v-if="shared"
                class="native-shared-badge"
              ><i />1</span>
            </div>
          </div>
          <div class="native-detail-rows">
            <slot />
          </div>
        </div>
        <slot name="after-card">
          <div class="native-list-ai">
            <span>AI Features</span><UIcon name="i-lucide-chevron-down" />
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.native-list-detail{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;background:var(--md-surface)}
.native-list-viewport{position:relative;flex:1;min-height:0;overflow:hidden;overscroll-behavior:contain;scrollbar-width:none}
.native-list-viewport::-webkit-scrollbar{display:none}
.native-list-content{position:relative;padding:12px}
.native-detail-card{overflow:hidden;border-radius:16px;background:#fff;color:var(--md-on-surface)}
.native-detail-heading{padding:16px 16px 8px;background:linear-gradient(color-mix(in srgb,var(--md-primary) 20%,transparent),transparent)}
.native-detail-title{display:flex;align-items:center;gap:8px;min-width:0;justify-content:space-between}
.native-detail-title>h3{min-width:0;overflow-wrap:anywhere;font:var(--demo-list-heading);margin:0;letter-spacing:normal}
.native-detail-lock{display:block;flex:0 0 24px;height:24px;background:var(--md-primary);mask:url('/images/brand/android-lock-private.svg') center/contain no-repeat}
.native-detail-meta{display:flex;align-items:center;gap:8px;font-size:16px;line-height:20px;margin-top:4px}
.native-shared-badge{display:inline-flex;align-items:center;gap:4px;color:var(--md-primary);font-size:14px;line-height:20px}
.native-shared-badge>i{display:block;width:16px;height:16px;background:currentColor;mask:url('/images/brand/android-people.svg') center/contain no-repeat}
.native-detail-rows{display:grid;gap:8px;padding:8px 16px 16px}
.native-detail-rows :deep(.list-item-row){min-height:52px;box-shadow:0 1px 2px #00000014}
.native-detail-rows :deep(.list-item-row>button:not(.list-item-action)){min-height:52px}
/* ListItemContent.kt: 24dp icon + 14dp padding each side; height follows the row. */
.native-detail-rows :deep(.list-item-row>.list-item-action){align-self:stretch;height:auto;width:52px;min-width:52px;flex:0 0 52px;padding:0}
.native-detail-rows :deep(.list-item-action .iconify){width:24px;height:24px}
.native-detail-rows :deep(.text-\[1\.25rem\]){font-size:20px;line-height:24px}
.native-list-ai{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;padding:12px 16px;margin-top:12px;background:color-mix(in srgb,var(--md-surface-variant) 50%,transparent);font-size:18px;line-height:24px;font-weight:700;color:var(--md-on-surface-variant)}
.native-list-ai>.iconify{width:20px;height:20px;flex:0 0 20px}
</style>
