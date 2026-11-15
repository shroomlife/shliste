declare module 'nuxt/schema' {
  // Öffentliche String-Felder aus nuxt.config.ts auch über Nuxt 4.6s Schema-Reexport verfügbar machen.
  interface PublicRuntimeConfig {
    apiBase: string
    googleClientId: string
    vapidPublicKey: string
    gaMeasurementId: string
  }

  interface RuntimeConfig {
    // Bindet die von Nuxt generierten öffentlichen Felder auch an den
    // RuntimeConfig-Zugriff; Nuxt 4.6 reexportiert hier sonst den Basistyp.
    public: PublicRuntimeConfig
  }
}

export {}
