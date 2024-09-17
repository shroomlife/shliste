<script lang="ts" setup>
const headerLinks = computed(() => [
  {
    label: 'Listen',
    icon: 'i-ph-list-checks',
    to: '/',
  },
  {
    label: 'Produkte',
    icon: 'i-ph-shopping-cart',
    to: '/produkte',
  },
  {
    label: 'Supermärkte',
    icon: 'i-ph-storefront',
    to: '/markets',
  },
  {
    label: 'Rezepte',
    icon: 'i-ph-book',
    to: '/rezepte',
  },
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

  return headerLinks.value
})
</script>

<template>
  <main>
    <header class="sticky top-0 z-50 flex items-center justify-start p-4 bg-pink-100/80 shadow backdrop-blur">
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
