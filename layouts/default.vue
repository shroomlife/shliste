<script lang="ts" setup>
const listStore = useListStore()
const productStore = useProductStore()
const marketStore = useMarketStore()

const links = computed(() => [
  {
    label: 'Listen',
    icon: 'i-ph-list-checks',
    to: '/',
    badge: listStore.getActiveListsCount,
  },
  {
    label: 'Produkte',
    icon: 'i-ph-shopping-cart',
    to: '/produkte',
    badge: productStore.getProductsCount,
  },
  {
    label: 'Supermärkte',
    icon: 'i-ph-storefront',
    to: '/markets',
    badge: marketStore.getMarketsCount,
  },
  // {
  //   label: 'Archiv',
  //   icon: 'i-ph-archive-box',
  //   to: '/archiv',
  //   badge: listStore.getArchivedListsCount,
  //   disabled: listStore.getArchivedListsCount === 0,
  // },
])

const route = useRoute()

const computedShowActionsBar = computed(() => {
  return route.meta.showActionsBar
})

const backLinks = computed(() => [
  {
    label: 'Zurück zur Übersicht',
    to: '/',
    icon: 'i-ph-arrow-left-bold',
  },
])

const computedLinks = computed(() => {
  if (route.meta.isSingleList) {
    return backLinks.value
  }

  return links.value
})
</script>

<template>
  <main>
    <header class="flex items-center justify-start p-4 bg-pink-100">
      <div class="container mx-auto flex items-center justify-between">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <AppLogo class="w-10 h-10 md:w-12 md:h-12 shrink-0" />
          <h1 class="text-4xl font-bold">
            shliste
          </h1>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <CloudSyncIcon />
          <Sidebar />
        </div>
      </div>
    </header>
    <div class="container mx-auto">
      <UHorizontalNavigation
        :links="computedLinks"
        class="border-b border-gray-200 dark:border-gray-800"
        :ui="{
          base: 'text-lg',
        }"
      />
      <div class="p-4 flex flex-col">
        <slot />
      </div>
      <ActionsBar v-if="computedShowActionsBar" />
    </div>
    <footer />
    <ListEdit />
    <ProductEdit />
    <ListedProductEdit />
    <UNotifications />
    <CloudSync />
  </main>
</template>

<style lang="scss" scoped>

</style>
