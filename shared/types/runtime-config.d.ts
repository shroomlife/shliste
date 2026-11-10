import type { PublicRuntimeConfig } from 'nuxt/schema'

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    // Bindet die von Nuxt generierten öffentlichen Felder auch an den
    // RuntimeConfig-Zugriff; Nuxt 4.6 reexportiert hier sonst den Basistyp.
    public: PublicRuntimeConfig
  }
}

export {}
