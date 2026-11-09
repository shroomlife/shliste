<script setup lang="ts">
import { premiumFeatures, type PremiumFeature } from '~/utils/premiumFeatures'

const props = withDefaults(defineProps<{ feature?: PremiumFeature }>(), { feature: 'general' })
const open = defineModel<boolean>('open', { default: false })
const { aiAccess } = useAiAccess()
const state = computed(() => aiAccess.value?.state ?? 'none')
const feature = computed(() => premiumFeatures[props.feature])
</script>

<template>
  <AppSheet
    v-model:open="open"
    :title="feature.title"
    compact-header
    description="Bald mit shliste Premium."
  >
    <div class="premium-preview">
      <PremiumComingSoonBadge variant="sheet" />
      <div
        class="premium-feature"
        :class="{ 'premium-feature--image': props.feature === 'image' }"
      >
        <div
          v-if="props.feature === 'image'"
          class="premium-art"
        >
          <img
            src="/images/editorial/french-onion-pasta/v2/hero-small.webp"
            alt="Beispiel einer KI-generierten Rezeptillustration: French Onion Pasta in blauen Schalen"
            width="768"
            height="432"
          >
          <span>Stilvorschau · KI-generiert</span>
        </div>
        <div class="premium-feature-heading">
          <p class="premium-eyebrow">
            {{ feature.label }}
          </p>
          <span class="premium-feature-icon"><UIcon :name="feature.icon" /></span>
          <p class="premium-result">
            {{ feature.result }}
          </p>
        </div>
        <p class="premium-intro">
          {{ feature.detail }}
        </p>
      </div>
      <div class="premium-next">
        <p
          v-if="state === 'confirmed'"
          class="premium-status"
        >
          Du bist schon vorgemerkt. Wir melden uns zum Start.
        </p>
        <p
          v-else-if="state === 'pending'"
          class="premium-status"
        >
          Fast geschafft: Bestätige noch deine E-Mail-Adresse.
        </p>
        <NuxtLink
          class="premium-action"
          to="/warteliste"
          @click="open = false"
        >
          <span>{{ state === 'confirmed' ? 'Deine Anmeldung ansehen' : state === 'pending' ? 'Zur Anmeldung' : 'Zum Start Bescheid bekommen' }}</span>
          <UIcon name="i-lucide-arrow-right" />
        </NuxtLink>
        <p class="premium-footnote">
          Deine Listen und Rezepte nutzt du wie gewohnt weiter.
        </p>
      </div>
    </div>
  </AppSheet>
</template>

<style scoped>
.premium-preview{display:grid;gap:1.25rem;min-width:0}
.premium-feature{position:relative;min-width:0;overflow:hidden;display:grid;gap:.875rem;padding:1.125rem;border:1px solid var(--md-outline-variant);border-radius:1.25rem;background:var(--md-surface-low);animation:premium-arrive .24s ease-out both}
.premium-feature::before{content:'';position:absolute;top:0;left:1.125rem;width:3rem;height:2px;background:var(--md-primary);opacity:.65}
.premium-feature-heading{display:flex;align-items:flex-start;gap:.75rem;min-width:0}
.premium-feature-heading > div{min-width:0}
.premium-feature-icon{flex:none;display:grid;place-items:center;width:2rem;height:2rem;border-radius:.625rem;background:var(--md-primary-container);color:var(--md-on-primary-container)}
.premium-feature-icon .iconify{width:1.125rem;height:1.125rem}
.premium-eyebrow{margin:0;color:var(--md-primary);font-size:.8125rem;font-weight:650;line-height:1.25rem}
.premium-result{margin:.1875rem 0 0;font-size:1rem;font-weight:650;line-height:1.4;color:var(--md-on-surface)}
.premium-intro,.premium-status{margin:0;font-size:.9375rem;line-height:1.5;color:var(--md-on-surface-variant)}
.premium-art{position:relative;overflow:hidden;aspect-ratio:16/9;border-radius:.75rem;background:var(--md-surface)}
.premium-art img{display:block;width:100%;height:100%;object-fit:cover}
.premium-art > span{position:absolute;left:.625rem;bottom:.625rem;border-radius:999px;background:#fff9f3ed;color:#382432;padding:.25rem .625rem;font-size:.6875rem;line-height:1.4}
.premium-next{display:grid;gap:.75rem;min-width:0}
.premium-action{display:flex;align-items:center;justify-content:center;gap:.625rem;min-height:3rem;padding:.75rem 1rem;border-radius:999px;background:var(--md-primary);color:var(--md-on-primary);font-weight:650;line-height:1.4;text-align:center;text-decoration:none;transition:filter .18s,box-shadow .18s}
.premium-action > span:first-child{min-width:0}
.premium-action:hover{filter:brightness(1.07);box-shadow:0 4px 14px color-mix(in srgb,var(--md-primary) 18%,transparent)}
.premium-action:focus-visible{outline:2px solid var(--md-primary);outline-offset:3px}
.premium-action .iconify{flex:none;width:1.125rem;height:1.125rem;transition:transform .18s}
.premium-action:hover .iconify{transform:translateX(2px)}
.premium-footnote{margin:0;font-size:.8125rem;line-height:1.5;text-align:center;color:var(--md-on-surface-variant)}
@keyframes premium-arrive{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.premium-feature{animation:none}.premium-action,.premium-action .iconify{transition:none}.premium-action:hover .iconify{transform:none}}
/* One continuous badge, with a single baseline and a quiet one-shot sheen. */
.premium-feature-heading{position:relative;display:grid;grid-template-columns:2rem minmax(0,1fr);column-gap:.75rem;row-gap:0;align-items:center}
.premium-eyebrow{grid-column:2;grid-row:1;margin:0;line-height:1rem}
.premium-feature-icon{position:absolute;left:0;top:calc(1rem + .7rem - 1rem);grid-column:auto;grid-row:auto}
.premium-result{grid-column:2;grid-row:2;margin:0;min-height:0;display:block;line-height:1.4}
</style>
