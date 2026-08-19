export default defineAppConfig({
  ui: {
    // Nuxt UI v4: Farben liegen unter ui.colors, nicht mehr flach.
    // "primary" traegt das Marken-Magenta #E064B2 (siehe main.css),
    // "neutral" ersetzt das frueher "gray" genannte Alias.
    colors: {
      primary: 'brand',
      neutral: 'zinc',
    },
  },
})
