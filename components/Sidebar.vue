<script lang="ts" setup>
const listStore = useListStore()
const productStore = useProductStore()
const googleStore = useGoogleStore()
const marketStore = useMarketStore()
const appStore = useAppStore()

const openMenu = () => {
  appStore.openSidebar()
}
const closeMenu = () => {
  appStore.closeSidebar()
}

const isSidebarOpen = computed({
  get: () => appStore.getSidebarIsOpen,
  set: (value) => {
    appStore.setSidebarIsOpen(value)
  },
})

const isGoogleConnected = computed(() => googleStore.getIsConnected)
const isGoogleConnecting = ref(false)

const sidebarLinks = computed(() => {
  const appLinks = [
    {
      label: 'Listen',
      icon: 'i-ph-list-checks',
      to: '/',
      badge: listStore.getActiveListsCount,
      click: closeMenu,
    },
    {
      label: 'Produkte',
      icon: 'i-ph-shopping-cart',
      to: '/produkte',
      badge: productStore.getProductsCount,
      click: closeMenu,
    },
    {
      label: 'Supermärkte',
      icon: 'i-ph-storefront',
      to: '/markets',
      badge: marketStore.getMarketsCount,
      click: closeMenu,
    },
    {
      label: 'Archiv',
      icon: 'i-ph-archive-box',
      to: '/archiv',
      badge: listStore.getArchivedListsCount || 0,
      disabled: listStore.getArchivedListsCount === 0,
      click: () => {
        if (listStore.getArchivedListsCount > 0) {
          closeMenu()
        }
      },
    },
  ]

  const siteLinks = [
    {
      label: 'Datenschutz',
      to: '/datenschutz',
      icon: 'i-ph-shield-check-bold',
      click: closeMenu,
    },
    {
      label: 'Impressum',
      to: '/impressum',
      icon: 'i-ph-file-text-bold',
      click: closeMenu,
    },
  ]

  return [
    appLinks,
    siteLinks,
  ]
})

const navUiConfig = computed(() => {
  return {
    label: 'text-lg',
  }
})

const handleConnectGoogle = () => {
  isGoogleConnecting.value = true
  googleStore.connect()
}

const computedUser = computed(() => googleStore.getUser) as ComputedRef<GoogleUser | null>

const optionItems = [
  [{
    label: 'Abmelden',
    icon: 'i-ph-sign-out-bold',
    click: () => {
      googleStore.logout()
    },
  }],
]
</script>

<template>
  <div>
    <UButton
      color="white"
      variant="link"
      size="lg"
      square
      padded
      @click="openMenu"
    >
      <UChip
        color="orange"
        :show="!googleStore.getIsConnected"
      >
        <UIcon
          name="i-ph-list-bold"
          class="w-6 h-6"
        />
      </UChip>
    </UButton>
    <USlideover
      v-model="isSidebarOpen"
    >
      <div class="p-4 flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img
              src="/images/logo/favicon.png"
              class="w-10 h-10 md:w-12 md:h-12 shrink-0"
              alt="shliste"
            >
            <h1 class="text-4xl font-bold">
              menü
            </h1>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            size="lg"
            icon="i-ph-x-bold"
            square
            padded
            @click="closeMenu"
          />
        </div>

        <UAlert
          v-if="!isGoogleConnected"
          icon="i-ph-warning-bold"
          color="orange"
          variant="solid"
          title="Achtung!"
          description="Im Moment sind deine Listen und Produkte nur auf deinem Device gespeichert. Um Verlust von Daten zu vermeiden, solltest du dich mit deinem Google Drive verbinden."
        />

        <UCard>
          <template #header>
            <div class="flex flex-col gap-3">
              <div class="flex justify-between items-center">
                <div class="flex flex-col gap-2">
                  <span class="text-xl font-bold">
                    Synchronisation deiner Daten
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="isGoogleConnected"
                    color="white"
                    variant="solid"
                    icon="i-ph-check-bold"
                    size="md"
                    class="flex items-center gap-1"
                  >
                    <UIcon
                      name="i-ph-circle-fill"
                      class="text-green-500"
                    />
                    <span>Aktiv</span>
                  </UBadge>
                  <UBadge
                    v-else
                    color="white"
                    variant="solid"
                    icon="i-ph-check-bold"
                    size="md"
                    class="flex items-center gap-1"
                  >
                    <UIcon
                      name="i-ph-circle-fill"
                      class="text-red-500"
                    />
                    <span>Inaktiv</span>
                  </UBadge>
                </div>
              </div>
              <div
                v-if="computedUser"
                class="flex justify-between items-center gap-2"
              >
                <span>
                  Verbunden mit <strong>{{ computedUser.email }}</strong>
                </span>

                <UDropdown
                  v-if="isGoogleConnected"
                  :items="optionItems"
                  :ui="{
                    item: {
                      label: 'text-base',
                    },
                  }"
                >
                  <UButton
                    color="gray"
                    icon="i-ph-dots-three-bold"
                    square
                    padded
                  />
                </UDropdown>
              </div>
            </div>
          </template>

          <template
            v-if="!isGoogleConnected"
            #footer
          >
            <UButton
              color="green"
              class="w-full"
              variant="solid"
              size="lg"
              icon="i-bxl-google"
              :loading="isGoogleConnecting"
              @click="handleConnectGoogle"
            >
              Mit Google Drive verbinden
            </UButton>
          </template>
        </UCard>

        <UDivider />

        <UVerticalNavigation
          :ui="navUiConfig"
          :links="sidebarLinks"
        />
      </div>
    </USlideover>
  </div>
</template>

<style lang="scss" scoped>

</style>
