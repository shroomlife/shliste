<script setup lang="ts">
defineProps<{ discover?: boolean }>()
</script>

<template>
  <aside class="collection-bridge">
    <span class="bridge-symbol"><UIcon :name="discover ? 'i-lucide-chef-hat' : 'i-lucide-book-open'" /></span>
    <div><h2>{{ discover ? 'Noch keine Idee für heute?' : 'Gefunden. Gespeichert. Wieder gekocht.' }}</h2><p>{{ discover ? 'In unseren Rezeptideen findest du pflanzliche Gerichte mit Bildern zu jedem Schritt. Dein Favorit kann direkt in deine eigene Sammlung.' : 'Behalte ein Rezept, passe es für dich an und hake beim Kochen die Schritte ab. So wird aus einer guten Idee dein eigenes Rezeptbuch.' }}</p></div>
    <NuxtLink :to="discover ? '/rezeptideen' : '/rezepte'">{{ discover ? 'Rezeptideen entdecken' : 'Deine Rezeptsammlung kennenlernen' }}<UIcon name="i-lucide-arrow-right" /></NuxtLink>
  </aside>
</template>

<style scoped>
.collection-bridge{display:grid;grid-template-columns:3rem minmax(0,1fr) auto;align-items:center;gap:1.5rem;padding:clamp(1.25rem,3vw,2rem);margin-block:3rem;border:1px solid var(--md-outline-variant);border-radius:1.5rem;background:var(--md-surface-container-low);color:var(--md-on-surface)}.bridge-symbol{width:3rem;height:3rem;display:grid;place-items:center;border-radius:1rem;background:var(--md-secondary-container);color:var(--md-primary);align-self:start}.bridge-symbol .iconify{width:1.6rem;height:1.6rem}.collection-bridge h2{font-size:clamp(1.2rem,2vw,1.5rem);line-height:1.25;margin:0}.collection-bridge p{margin:.6rem 0 0;line-height:1.6;font-size:1rem;max-width:42rem;color:var(--md-on-surface-variant)}.collection-bridge a{display:inline-flex;align-items:center;gap:.65rem;font-weight:700;color:var(--md-primary);max-width:17rem;line-height:1.4}.collection-bridge a .iconify{flex-shrink:0;width:1.25rem;height:1.25rem}@media(max-width:900px){.collection-bridge{grid-template-columns:3rem minmax(0,1fr);gap:1rem}.collection-bridge a{grid-column:2;max-width:none}}@media(max-width:400px){.collection-bridge{grid-template-columns:minmax(0,1fr)}.collection-bridge a{grid-column:1}}
</style>
