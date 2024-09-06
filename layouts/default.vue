<script lang="ts" setup>
const links = [{
  label: 'Aktiv',
  icon: 'i-ph-check-square-offset',
  to: '/',
},
{
  label: 'Archiviert',
  icon: 'i-ph-archive-box',
  to: '/archiv',
}]

const route = useRoute()

const computedShowListNavigation = computed(() => {
  return !route.path.startsWith('/list')
})
</script>

<template>
  <main>
    <header class="flex items-center justify-between p-2 bg-pink-100">
      <NuxtLink
        to="/"
        class="container mx-auto flex items-center gap-2"
      >
        <AppLogo class="w-10 h-10 md:w-12 md:h-12 shrink-0" />
        <h1 class="text-3xl font-bold">
          shliste
        </h1>
      </NuxtLink>
    </header>
    <div class="container mx-auto">
      <UHorizontalNavigation
        v-if="computedShowListNavigation"
        :links="links"
        class="border-b border-gray-200 dark:border-gray-800"
      />
      <div class="p-4 flex flex-col">
        <slot />
      </div>
      <ActionsBar />
    </div>
    <footer />
    <ListEdit />
  </main>
</template>

<style lang="scss" scoped>

</style>
