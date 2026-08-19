export default defineAppConfig({
  ui: {
    // Nuxt UI v4: Farben liegen unter ui.colors, nicht mehr flach.
    // "primary" trägt das Marken-Magenta #E064B2 (siehe main.css),
    // "neutral" ersetzt das früher "gray" genannte Alias.
    colors: {
      primary: 'brand',
      neutral: 'zinc',
    },
  },
})
