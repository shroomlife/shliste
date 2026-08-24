export default defineAppConfig({
  ui: {
    // Nuxt UI v4: Farben liegen unter ui.colors, nicht mehr flach.
    // "primary" trägt das Marken-Magenta #E064B2 (siehe main.css),
    // "neutral" ersetzt das früher "gray" genannte Alias.
    colors: {
      primary: 'brand',
      neutral: 'zinc',
    },

    /*
     * Ladeplatzhalter. Die Vorgabe von Nuxt UI ist `bg-elevated` aus der
     * neutralen Palette — hier laufen die Flächen aber über die
     * Material-Tokens aus main.css, sonst sitzt ein grauer Balken in einer
     * rosé getönten Blase.
     *
     * `motion-reduce:animate-none` steht bewusst HIER und nicht an jeder
     * Verwendung: Wer Bewegung abgeschaltet hat, will das überall, und eine
     * Regel an einer Stelle kann man nicht an der nächsten vergessen.
     */
    skeleton: {
      base: 'animate-pulse rounded-md bg-[var(--md-outline-variant)] motion-reduce:animate-none',
    },

    /*
     * Bedienelemente derselben Grösse sind gleich hoch — hier steht es einmal,
     * statt an jeder Stelle als Klasse.
     *
     * Nuxt UI leitet die Höhe aus Polsterung plus Zeilenhöhe ab. Das ergibt für
     * sich stimmige, aber krumme Werte, und neben allem von Hand Gebauten mit
     * echter Höhe passt es dann um ein paar Pixel nicht. Die Zahlen kommen aus
     * `--size-control-*` in main.css, dort steht auch die Begründung.
     *
     * Die Polsterung bleibt unangetastet: Sie trägt die waagerechten Abstände
     * und den Platz für die Symbole. Nur die Höhe kommt dazu.
     *
     * Textfelder (`textarea`) bekommen bewusst KEINE feste Höhe — sie sind
     * mehrzeilig, das ist ihr ganzer Zweck.
     */
    input: {
      variants: {
        size: {
          lg: { base: 'h-[var(--md-control-lg)]' },
          xl: { base: 'h-[var(--md-control-xl)]' },
        },
      },
    },
    button: {
      variants: {
        size: {
          lg: { base: 'h-[var(--md-control-lg)]' },
          xl: { base: 'h-[var(--md-control-xl)]' },
        },
        /*
         * Ein Knopf, der nur ein Symbol trägt, ist quadratisch. Nuxt UI regelt
         * das sonst über die Polsterung — mit einer festen Höhe stimmt die
         * Breite dann nicht mehr mit. `aspect-square` bindet sie an die Höhe,
         * egal welche Grösse.
         */
        square: { true: 'aspect-square' },
      },
    },
    select: {
      variants: {
        size: {
          lg: { base: 'h-[var(--md-control-lg)]' },
          xl: { base: 'h-[var(--md-control-xl)]' },
        },
      },
    },
  },
})
