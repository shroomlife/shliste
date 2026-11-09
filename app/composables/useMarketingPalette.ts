import { marketingPalettes, marketingPaletteStyle } from '~/utils/marketingPalette'

// Shared only by the marketing preview. Never changes the signed-in app theme.
export function useMarketingPalette() {
  const palette = useState('marketing-palette', () => 0)
  const selection = useState('marketing-palette-selection', () => 0)
  const handoff = useState('marketing-hero-handoff', () => -1)
  function choose(index: number) {
    palette.value = index % marketingPalettes.length
    selection.value++
  }
  return { palette, selection, handoff, choose, style: computed(() => marketingPaletteStyle(palette.value)) }
}

// A colour selection immediately reaches every scene, including off-screen scenes.
// Local colour cycles may continue afterwards without touching the playback phase.
export function useMarketingDemoPalette() {
  const { palette, selection } = useMarketingPalette()
  const offset = ref(0)
  watch([palette, selection], () => {
    offset.value = 0
  }, { flush: 'sync' })
  const index = computed(() => (palette.value + offset.value) % marketingPalettes.length)
  return { index, style: computed(() => marketingPaletteStyle(index.value)), next: () => {
    offset.value++
  } }
}
