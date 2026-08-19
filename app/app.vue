<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Ausserhalb des Layouts: Eine neue Fassung der App betrifft jede Seite,
         auch die öffentlichen. -->
    <PwaUpdatePrompt />
  </UApp>
</template>
