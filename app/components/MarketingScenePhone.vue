<script setup lang="ts">
withDefaults(defineProps<{ title?: string, detail?: 'list' | 'recipe' | 'overview' | 'profile' | 'locked', input?: boolean, shared?: boolean, value?: string, offline?: boolean }>(), { title: '', detail: 'list', input: false, shared: false, value: '', offline: false })
</script>

<template>
  <div class="scene-phone">
    <div class="scene-screen">
      <div class="scene-status">
        <span>9:41</span><i /><span><UIcon :name="offline ? 'i-lucide-wifi-off' : 'i-lucide-wifi'" /><UIcon name="i-lucide-battery-full" /></span>
      </div>
      <MarketingAppToolbar v-if="detail !== 'locked'" />
      <MarketingListActions
        v-if="detail === 'list' || detail === 'recipe'"
        :recipe="detail === 'recipe'"
        :shared="shared"
      />
      <div class="scene-phone-content">
        <h3
          v-if="title"
          :class="{ 'scene-list-title': detail === 'list' || detail === 'locked' }"
        >
          {{ title }}
        </h3><slot />
      </div>
      <MarketingListInputBar
        v-if="input"
        :value="value"
      />
      <MarketingAppBottomBar v-else-if="detail === 'overview'" />
      <hr
        v-else
        class="native-bottom-divider"
        aria-hidden="true"
      >
      <div class="scene-gesture" />
    </div>
  </div>
</template>

<style scoped>
.scene-phone{width:296px;max-width:100%;padding:5px;border-radius:33px;background:linear-gradient(135deg,#fff,#d3cbd2 55%,#fff);border:1px solid #4a34451a;box-shadow:0 20px 40px -24px #45223f66;justify-self:center;color:var(--md-on-surface)}.scene-screen{border-radius:27px;background:var(--md-surface);overflow:hidden}.scene-status{position:relative;height:27px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:12px}.scene-status>i{position:absolute;left:50%;width:7px;height:7px;background:#322b34;border-radius:50%;transform:translateX(-50%)}.scene-status>span:last-child{display:flex;gap:4px}.scene-status .iconify{width:13px;height:13px}.scene-phone-content{padding:16px 12px;min-height:260px;position:relative}.scene-phone-content>h3{font-size:24px;line-height:1.15;font-weight:800;margin:0 0 16px}.scene-phone-content :deep(.min-h-15){min-height:60px;height:60px}.scene-phone-content :deep(.text-\[1\.25rem\]){font-size:18px}.scene-phone-content :deep(.text-\[0\.875rem\]){font-size:13px;line-height:15px}.scene-gesture{height:4px;width:70px;border-radius:4px;background:var(--md-on-surface);opacity:.5;margin:6px auto 9px}
</style>

<style scoped>
/* Keep the device and the surrounding article still when a story changes screens. */
.scene-screen{height:620px;display:flex;flex-direction:column}.scene-phone-content{flex:1;min-height:0}.scene-status,.scene-screen>.native-toolbar,.scene-screen>.list-actions,.scene-screen>.native-bottom,.scene-screen>.list-input-bar,.scene-gesture{flex-shrink:0}
.scene-phone .scene-phone-content > h3.scene-list-title { font: var(--demo-list-heading); }
</style>
