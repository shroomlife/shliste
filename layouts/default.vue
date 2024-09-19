<script lang="ts" setup>
const headerLinks = computed(() => [
  appNavigation.lists,
  appNavigation.products,
  appNavigation.markets,
  appNavigation.recipes,
])

const route = useRoute()

const computedShowActionsBar = computed(() => {
  return route.meta.showActionsBar
})

const computedShowTopNavigation = computed(() => {
  return typeof route.meta.showTopNavigation === 'undefined'
})

const backLinks = (to: string) => [
  {
    label: 'Zurück zur Übersicht',
    to: to,
    icon: 'i-ph-arrow-left-bold',
  },
]

const computedLinks = computed(() => {
  if (route.meta.isSingleList && route.meta.backLink) {
    return backLinks(route.meta.backLink as string)
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
          <AppLogo class="app-logo w-8 h-8 md:w-10 md:h-10 shrink-0" />
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
        v-if="computedShowTopNavigation"
        :links="computedLinks"
        class="border-b border-gray-200 dark:border-gray-800"
        :ui="{
          base: 'text-lg',
          container: 'px-2',
        }"
      />
      <div class="p-4 flex flex-col">
        <slot />
      </div>
    </div>
    <ActionsBar v-if="computedShowActionsBar" />
    <UNotifications />
  </main>
</template>

<style lang="scss" scoped>

</style>
