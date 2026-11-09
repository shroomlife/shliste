<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean, stacked?: boolean, state?: string }>(), { compact: false, stacked: false, state: 'none' })
const route = useRoute()
</script>

<template>
  <aside
    class="ai-invitation"
    :class="{ 'ai-invitation--compact': compact, 'ai-invitation--stacked': stacked }"
    aria-label="KI in der Testphase"
  >
    <div
      class="ai-invitation__art"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-cooking-pot"
        class="ai-invitation__pot"
      />
      <UIcon
        name="i-lucide-sparkles"
        class="ai-invitation__spark"
      />
      <span class="ai-invitation__steam" />
    </div>
    <div class="ai-invitation__copy">
      <strong>{{ state === 'confirmed' ? 'Du bist vorgemerkt. Wir freuen uns auf dich.' : state === 'pending' ? 'Ein kleiner Klick fehlt noch.' : 'Da köchelt etwas für dich.' }}</strong>
      <p>{{ state === 'confirmed' ? 'Sobald du die KI nutzen kannst, bekommst du eine E-Mail von uns.' : state === 'pending' ? 'Bestätige deine E-Mail, damit wir dich zum KI-Start benachrichtigen dürfen.' : 'Eine Idee aussprechen. Ein Rezept mitnehmen. Unsere KI wird noch im kleinen Kreis getestet.' }}</p>
    </div>
    <NuxtLink
      v-if="route.path !== '/warteliste'"
      to="/warteliste"
      class="ai-invitation__link"
    >{{ state === 'confirmed' ? 'Deine Anmeldung' : state === 'pending' ? 'Zur Anmeldung' : 'Beim Start dabei sein' }}<UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
  </aside>
</template>

<style scoped>
.ai-invitation {
  --invitation-art-size: 3.5rem;
  display: grid;
  grid-template-columns: var(--invitation-art-size) minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem 1.25rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--md-primary, #a63780) 18%, transparent);
  border-radius: 1.5rem;
  background: linear-gradient(125deg, var(--md-surface, #fff8fc), var(--md-primary-container, #fae6f1));
  color: var(--md-on-surface, #382333);
  isolation: isolate;
}
.ai-invitation__art { position: relative; display: grid; place-items: center; width: var(--invitation-art-size); height: var(--invitation-art-size); border-radius: 1rem; background: var(--md-surface, #fff); color: var(--md-primary, #a63780); }
.ai-invitation__pot { width: 1.75rem; height: 1.75rem; animation: pot-arrive .5s cubic-bezier(.2,.8,.2,1) both; }
.ai-invitation__spark { position: absolute; right: -.25rem; top: -.25rem; width: 1.25rem; height: 1.25rem; animation: spark-arrive .65s .1s both; }
.ai-invitation__steam { position: absolute; left: .9rem; top: .25rem; width: .3rem; height: .7rem; border-left: 1.5px solid currentColor; border-radius: 50%; opacity: .4; animation: steam-arrive .8s .15s both; }
.ai-invitation__copy { min-width: 0; }
.ai-invitation__copy strong { display: block; font-size: 1.05rem; line-height: 1.4; }
.ai-invitation__copy p { margin: .5rem 0 0; font-size: .9rem; line-height: 1.6; }
.ai-invitation__link { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 2.75rem; max-width: 100%; padding: .75rem 1rem; border-radius: 999px; background: var(--md-primary, #a63780); color: var(--md-on-primary, #fff); font-weight: 650; font-size: .875rem; line-height: 1.4; text-align: center; text-decoration: none; transition: box-shadow .18s, filter .18s; }
.ai-invitation__link:hover { filter: brightness(1.08); box-shadow: 0 4px 14px #a6378020; }
.ai-invitation__link .iconify { flex: none; width: 1.125rem; height: 1.125rem; }
.ai-invitation__link:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.ai-invitation--compact { --invitation-art-size: 2.5rem; padding: 1rem; border-radius: 0; gap: .75rem 1rem; }
.ai-invitation--compact .ai-invitation__copy p { font-size: .8125rem; }
.ai-invitation--stacked { grid-template-columns: var(--invitation-art-size) minmax(0, 1fr); align-items: start; }
.ai-invitation--stacked .ai-invitation__link { grid-column: 2; justify-self: start; }
@keyframes pot-arrive { from { opacity: 0; transform: translateY(8px) scale(.85); } to { opacity: 1; transform: none; } }
@keyframes spark-arrive { from { opacity: 0; transform: translate(8px,-6px) rotate(-30deg) scale(.6); } to { opacity: 1; transform: none; } }
@keyframes steam-arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: .4; transform: none; } }
@media (max-width: 700px) {
  .ai-invitation { --invitation-art-size: 2.5rem; grid-template-columns: var(--invitation-art-size) minmax(0, 1fr); align-items: start; padding: 1.25rem; gap: 1rem; }
  .ai-invitation__link { grid-column: 2; justify-self: start; }
  .ai-invitation--compact { padding: 1rem; gap: .75rem 1rem; }
  .ai-invitation--compact .ai-invitation__copy p { display: none; }
}
@media (max-width: 380px) {
  .ai-invitation--stacked .ai-invitation__link { grid-column: 1 / -1; justify-self: stretch; }
}
@media (prefers-reduced-motion: reduce) { .ai-invitation * { animation: none; transition: none; } }
</style>
