<script setup lang="ts">
import type { List } from '#shared/types/domain'

const props = defineProps<{
  name: string
}>()
const list = computed<List>(() => ({ id: 'secret-preview', name: props.name, secret: true, color: '#B796D5', createdAt: '2026-11-03T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z', deletedAt: null, fieldTimestamps: null, lastSuggestedItems: '', sourceUrl: null, ownerUserId: null }))
</script>

<template>
  <div
    class="secret-list-choice"
    aria-hidden="true"
    inert
  >
    <ListCard
      :list="list"
      :open-count="3"
    />
    <span class="secret-list-touch"><i /><UIcon name="i-lucide-hand" /></span>
    <small>Geheime Liste öffnen</small>
  </div>
</template>

<style scoped>
.secret-list-choice{position:relative}.secret-list-choice :deep(a){padding:16px;min-height:88px}.secret-list-choice :deep(.text-\[1\.375rem\]){font-size:20px}.secret-list-choice>small{display:block;margin-top:12px;color:var(--md-on-surface-variant);font-size:14px}.secret-list-touch{position:absolute;right:19px;top:50px;width:32px;height:32px;display:grid;place-items:center;color:var(--md-primary);animation:list-touch 3.5s ease-in-out both}.secret-list-touch>.iconify{width:28px;height:28px;filter:drop-shadow(0 2px 2px var(--md-surface))}.secret-list-touch>i{position:absolute;inset:-7px;border:2px solid currentColor;border-radius:50%;animation:list-touch-ring 3.5s ease-out both}
@keyframes list-touch{0%,30%{opacity:0;transform:translate(15px,18px)}50%,70%{opacity:1;transform:translate(0,0)}80%{opacity:1;transform:scale(.9)}100%{opacity:0;transform:scale(1)}}
@keyframes list-touch-ring{0%,65%{opacity:0;scale:.5}75%{opacity:.7;scale:.6}100%{opacity:0;scale:1.5}}
@media(prefers-reduced-motion:reduce){.secret-list-touch,.secret-list-touch>i{animation:none}.secret-list-touch>i{display:none}}
</style>
