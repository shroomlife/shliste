<script lang="ts" setup>
const googleStore = useGoogleStore()
const computedIsSyncing = computed({
  get: () => googleStore.getLoading,
  set: (value: boolean) => googleStore.setLoading(value),
})

const isInitialized = ref(false)

onMounted(async () => {
  if (isInitialized.value) {
    return
  }

  if (googleStore.getIsConnected) {
    googleStore.setLoading(true)
    const syncSuccess = await googleStore.pull()

    isInitialized.value = true
    if (!syncSuccess) {
      try {
        await googleStore.push()
      }
      catch (error) {
        console.error('Error at Push', error)
        googleStore.logout()
        const toast = useToast()
        toast.add({
          title: 'Fehler beim Synchronisieren!',
          color: 'red',
          icon: 'i-ph-warning',
        })
      }
    }
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
          class="w-24 h-24 text-green-500 mb-4"
        />
        <UIcon
          name="svg-spinners:3-dots-fade"
          class="w-10 h-10 text-green-500"
        />
        <p class="text-gray-500">
          Wir synchronisieren deine Listen mit Google Drive.
        </p>
      </div>
    </div>
  </UModal>
</template>

<style lang="scss" scoped>

</style>
