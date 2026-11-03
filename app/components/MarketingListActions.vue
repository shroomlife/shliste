<script setup lang="ts">
withDefaults(defineProps<{
  shared?: boolean
  recipe?: boolean
}>(), { shared: true, recipe: false })
</script>

<template>
  <!-- BackButton.kt: separate detail actions beneath the global AppHeader. -->
  <div
    class="list-actions"
    aria-hidden="true"
  >
    <span class="list-back"><i style="--glyph:url('/images/brand/android-arrow-left.svg')" /><span class="back-full">Zurück zur Übersicht</span><span class="back-short">Zurück</span></span><span class="list-action"><i :style="{ '--glyph': `url('/images/brand/android-${recipe ? 'edit' : 'history'}.svg')` }" /></span><span class="list-action"><i style="--glyph:url('/images/brand/android-share.svg')" /></span><span
      v-if="shared && !recipe"
      class="list-action"
    ><i style="--glyph:url('/images/brand/android-people.svg')" /></span>
  </div>
</template>

<style scoped>
.list-actions{container-type:inline-size;display:flex;align-items:stretch;min-height:48px;border-bottom:1px solid var(--md-secondary);color:var(--md-on-surface);font-family:var(--font-sans)}.list-back{display:flex;align-items:center;gap:6px;padding:0 12px;flex:1;min-width:0;font-size:16px;line-height:1.3}.list-back>span{white-space:nowrap}.list-back .back-short{display:none}.list-action{display:grid;place-items:center;width:40px;flex-shrink:0;border-left:1px solid var(--md-secondary);color:var(--md-primary)}.list-actions i{width:20px;height:20px;flex-shrink:0;background:currentColor;mask:var(--glyph) center/contain no-repeat}
@container(max-width:350px){.list-back .back-full{display:none}.list-back .back-short{display:inline}}
</style>
