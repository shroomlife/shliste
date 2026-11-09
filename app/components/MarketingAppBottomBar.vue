<script setup lang="ts">
withDefaults(defineProps<{ active?: 'lists' | 'recipes', progress?: number }>(), { active: 'lists' })
</script>

<template>
  <div
    class="native-bottom"
    :class="{ 'native-bottom--pager': progress !== undefined }"
    :style="progress === undefined ? undefined : { '--pager-shift': `${progress * 50}%` }"
    aria-hidden="true"
  >
    <i
      v-if="progress !== undefined"
      class="native-pager-indicator"
    />
    <span :class="{ selected: active === 'lists' }"><img
      src="/images/brand/android-lists.svg"
      alt=""
    ><i /></span>
    <span :class="{ selected: active === 'recipes' }"><img
      src="/images/brand/android-recipes.svg"
      alt=""
    ><i /></span>
  </div>
</template>

<style scoped>
/* AppBottomBar.kt: 56dp, icon-only destinations, 36dp original Android glyphs. */
.native-bottom{border-top:1px solid var(--md-primary);height:57px;display:flex;align-items:center;justify-content:space-around;background:var(--md-surface);color:var(--md-on-surface-variant);flex-shrink:0}
.native-bottom>span{display:grid;place-items:center;position:relative;isolation:isolate;width:64px;height:40px;border-radius:24px}.native-bottom>span.selected{background:var(--md-secondary-container);color:var(--md-on-surface)}
.native-bottom img{display:none}.native-bottom i{width:36px;height:36px;display:block;background:currentColor;mask:url('/images/brand/android-lists.svg') center/contain no-repeat}.native-bottom>span+span i{mask-image:url('/images/brand/android-recipes.svg')}
</style>

<style scoped>
.native-bottom--pager{position:relative}.native-bottom--pager>.native-pager-indicator{mask:none;position:absolute;left:calc(25% + var(--pager-shift) - 32px);top:8px;width:64px;height:40px;border-radius:24px;background:var(--md-secondary-container)}.native-bottom--pager>span.selected{background:transparent}
</style>
