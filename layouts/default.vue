<script lang="ts" setup>
const links = [
  {
    label: 'Listen',
    icon: 'i-ph-check-square-offset',
    to: '/',
  },
  {
    label: 'Produkte',
    icon: 'i-ph-shopping-cart',
    to: '/produkte',
  },
  {
    label: 'Archiv',
    icon: 'i-ph-archive-box',
    to: '/archiv',
  },
]

const route = useRoute()

const computedShowActionsBar = computed(() => {
  return route.meta.showActionsBar
})

const backLinks = [
  {
    label: 'Zurück zur Übersicht',
    to: '/',
    icon: 'i-ph-arrow-left-bold',
  },
]

const computedLinks = computed(() => {
  if (route.meta.isSingleList) {
    return backLinks
  }

  return links
})
</script>

<template>
  <main>
    <header class="flex items-center justify-start p-4 bg-pink-100">
      <NuxtLink
        to="/"
        class="container mx-auto flex items-center gap-2"
      >
        <AppLogo class="w-10 h-10 md:w-12 md:h-12 shrink-0" />
        <h1 class="text-4xl font-bold">
          shliste
        </h1>
      </NuxtLink>
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
    <UNotifications />
  </main>
</template>

<style lang="scss" scoped>

</style>
