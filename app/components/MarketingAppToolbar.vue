<script setup lang="ts">
withDefaults(defineProps<{
  platform?: 'android' | 'ios'
}>(), { platform: 'android' })
</script>

<template>
  <div
    class="native-toolbar"
    :class="{ 'native-toolbar--ios': platform === 'ios' }"
    aria-hidden="true"
  >
    <strong
      v-if="platform === 'ios'"
      class="ios-title"
    >shliste</strong>
    <span
      v-else
      class="native-wordmark"
    />
    <!-- On iOS this is the planned menu, labelled as a proposal by its preview. -->
    <span class="native-menu"><svg
      viewBox="0 0 24 24"
      fill="currentColor"
    ><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" /></svg></span>
  </div>
</template>

<style scoped>
/* AppHeader.kt: 120dp wordmark, 24dp icon in a 48dp target, primary divider. */
.native-toolbar{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 8px 0 16px;background:var(--md-surface);border-bottom:1px solid var(--md-primary);color:var(--md-primary);transition:background .6s,color .6s,border-color .6s}
.native-wordmark{display:block;width:120px;height:34px;max-width:65%;background:currentColor;mask:url('/images/brand/wordmark.svg') left center/contain no-repeat}
.native-menu{display:grid;place-items:center;width:48px;height:48px;flex-shrink:0}.native-menu svg{width:24px;height:24px}
.native-toolbar--ios{min-height:64px;border-bottom:0}.ios-title{font-family:Roboto,Arial,sans-serif;font-size:22px;font-weight:800}
</style>
