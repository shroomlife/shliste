export default defineAppConfig({
  ui: {
    primary: 'rose',
    strategy: 'merge',
    notifications: {
      position: 'top-0 bottom-auto',
    },
  },
  slideOver: {
    ui: {
      base: 'flex justify-end sm:justify-start',
    },
  },
  table: {
    ui: {
      default: {
        emptyState: {
          label: 'Keine Produkte',
          icon: 'i-ph-shopping-cart',
        },
      },
    },
  },
})
