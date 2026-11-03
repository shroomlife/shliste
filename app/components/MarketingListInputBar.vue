<script setup lang="ts">
withDefaults(defineProps<{
  platform?: 'android' | 'web'
  value?: string
  quantity?: number
}>(), { platform: 'android', value: '', quantity: 1 })
</script>

<template>
  <!-- Read-only rendering of ListBottomBar.kt / pages/app/lists/[id].vue. -->
  <div
    class="list-input-bar"
    :class="`list-input-bar--${platform}`"
    aria-hidden="true"
  >
    <div
      class="entry-field"
      :class="{ 'has-value': value }"
    >
      <UIcon
        v-if="platform === 'web'"
        name="i-lucide-plus"
      /><span>{{ value || (platform === 'android' ? 'Neuer Eintrag' : 'Artikel oder Link hinzufügen') }}</span>
    </div>
    <div class="entry-quantity">
      <UIcon
        v-if="platform === 'android'"
        name="i-lucide-chevron-up"
      /><b>{{ quantity }}{{ platform === 'android' ? 'x' : '×' }}</b><UIcon
        v-if="platform === 'android'"
        name="i-lucide-chevron-down"
      />
    </div>
    <div class="entry-add">
      <UIcon :name="platform === 'android' ? 'i-lucide-plus' : 'i-lucide-sparkles'" />
    </div>
  </div>
</template>

<style scoped>
.list-input-bar{container-type:inline-size;display:flex;align-items:center;padding:12px;border-top:1px solid var(--md-primary);background:var(--md-surface);color:var(--md-primary);flex-shrink:0;font-family:var(--font-sans)}
.entry-field{display:flex;align-items:center;gap:8px;flex:1;min-width:0;height:56px;padding:0 12px;background:var(--md-surface-container);border-radius:4px 4px 0 0;border-bottom:1px solid var(--md-on-surface-variant);font-size:20px;color:var(--md-on-surface-variant)}.entry-field span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.entry-field.has-value{color:var(--md-on-surface);border-bottom:2px solid var(--md-primary)}.entry-field>.iconify{width:18px;height:18px;flex-shrink:0}
.entry-quantity{display:flex;flex-direction:column;align-items:center;justify-content:center;width:50px;height:60px;flex-shrink:0}.entry-quantity>.iconify{width:16px;height:16px}.entry-quantity b{font-size:22px;line-height:28px;font-weight:700}.entry-add{display:grid;place-items:center;width:60px;height:60px;border-radius:8px;background:var(--md-primary);color:var(--md-on-primary,#fff);flex-shrink:0}.entry-add>.iconify{width:24px;height:24px}
.list-input-bar--web{gap:10px;border-top-color:var(--md-outline-variant);font-family:inherit}.list-input-bar--web .entry-field{height:48px;border:1px solid var(--md-outline-variant);border-radius:8px;background:var(--md-surface)}.list-input-bar--web .entry-quantity{width:48px;height:48px;border-radius:4px;background:var(--md-secondary);color:var(--md-on-secondary)}.list-input-bar--web .entry-quantity b{font-size:20px}.list-input-bar--web .entry-add{width:48px;height:48px;border-radius:12px}
@container(max-width:260px){.entry-field{height:48px;font-size:18px;padding-inline:8px}.entry-quantity{width:43px;height:52px}.entry-quantity b{font-size:20px;line-height:24px}.entry-quantity>.iconify{width:14px;height:14px}.entry-add{width:52px;height:52px}.entry-add>.iconify{width:21px;height:21px}}
</style>
