<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <span
    class="ai-label"
    :class="{ 'ai-label--compact': compact }"
    role="img"
    aria-label="KI-generiert"
    title="KI-generiert"
  >
    <UIcon
      name="i-lucide-sparkles"
      aria-hidden="true"
    />
    <span
      class="ai-label-full"
      aria-hidden="true"
    >KI-generiert</span>
    <span
      class="ai-label-short"
      aria-hidden="true"
    >AI</span>
  </span>
</template>

<style scoped>
.ai-label{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font:inherit;line-height:1.25;padding:5px 8px;border:1px solid #ffffffb3;border-radius:999px;background:#fffaf2f2;color:#493c43;box-shadow:0 1px 6px #30232914}
.ai-label--compact{gap:3px;padding:3px 6px}
.ai-label>.iconify{width:1.1em;height:1.1em;flex:0 0 1.1em}
.ai-label-short{display:none}
.ai-label--compact .ai-label-full{display:none}
.ai-label--compact .ai-label-short{display:inline}
@container ai-image (max-width:320px){.ai-label-full{display:none}.ai-label-short{display:inline}}
</style>
