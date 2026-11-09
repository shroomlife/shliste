import type { PremiumFeature } from '~/utils/premiumFeatures'

/** Local to each entry point: no persistent banner or cross-page modal state. */
export function usePremiumPreview() {
  const isAiUpsellOpen = ref(false)
  const premiumFeature = ref<PremiumFeature>('general')
  function showPremium(feature: PremiumFeature = 'general') {
    premiumFeature.value = feature
    isAiUpsellOpen.value = true
  }
  return { isAiUpsellOpen, premiumFeature, showPremium }
}
