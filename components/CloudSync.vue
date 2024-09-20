<script lang="ts" setup>
const toast = useToast()
const googleStore = useGoogleStore()

const computedIsSyncing = computed({
  get: () => googleStore.getLoading,
  set: (value: boolean) => googleStore.setLoading(value),
})

// const isInitialized = ref(false)

onMounted(async () => {
  if (!googleStore.getIsConnected) {
    return
  }

  try {
    googleStore.setLoading(true)
    const pullFileId: string | null = await googleStore.pull()
    if (pullFileId === null) {
      const isPushSuccess = await googleStore.push()
      if (!isPushSuccess) {
        toast.add({
          title: 'Fehler beim Synchronisieren!',
          color: 'rose',
          icon: 'i-ph-warning',
        })
      }
    }
  }
  catch (error) {
    console.error(error)
    toast.add({
      title: 'Fehler beim Synchronisieren!',
      color: 'rose',
      icon: 'i-ph-warning',
    })
  }
  finally {
    googleStore.setLoading(false)
  }
})
</script>

<template>
  <UModal
    v-model="computedIsSyncing"
    prevent-close
  >
    <div class="p-6">
      <div class="flex flex-col items-center justify-center">
        <UIcon
          name="i-mdi-google-drive"
          class="text-green-500"
          size="128"
        />
        <UIcon
          name="svg-spinners:3-dots-fade"
          class="text-green-500"
          size="64"
        />
        <p class="text-gray-500 text-lg">
          Wir synchronisieren deine Daten mit Google Drive
        </p>
      </div>
    </div>
  </UModal>
</template>

<style lang="scss" scoped>

</style>
