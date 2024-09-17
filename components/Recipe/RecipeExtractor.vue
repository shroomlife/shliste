<script lang="ts" setup>
import { object, string, type InferType } from 'yup'
import type { FormSubmitEvent } from '#ui/types'

const isOpen = ref(false)
const recipeContent = ref({})

const openModal = () => {
  isOpen.value = true
}
const closeModal = () => {
  isOpen.value = false
}

const state = reactive({
  recipeUrl: '',
})

const isLoading = ref(false)

const schema = object({
  recipeUrl: string().url('Ungültige URL').required('Erforderlich'),
})

type Schema = InferType<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    isLoading.value = true
    const { recipeUrl } = event.data
    const recipeResponse = await $fetch('/api/recipe/extract', {
      method: 'GET',
      params: {
        recipeUrl,
      },
    })
    recipeContent.value = recipeResponse
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <UButton
      class="shadow-md"
      icon="i-ph-magic-wand"
      size="xl"
      color="rose"
      variant="solid"
      @click="openModal"
    />
    <UModal v-model="isOpen">
      <UForm
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-ph-magic-wand"
                  size="28"
                />
                <h2 class="text-2xl font-bold">
                  Rezeptextraktor
                </h2>
              </div>
              <UButton
                color="gray"
                variant="ghost"
                size="md"
                icon="i-ph-x"
                square
                padded
                @click="closeModal"
              />
            </div>
          </template>

          <UFormGroup
            label="Rezept URL"
            name="recipeUrl"
            size="xl"
          >
            <UInput
              v-model="state.recipeUrl"
              placeholder="https://"
              :disabled="isLoading"
              icon="i-ph-brackets-curly"
            />
          </UFormGroup>

          {{ recipeContent }}

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="rose"
                variant="solid"
                size="xl"
                type="submit"
                :loading="isLoading"
              >
                Extrahieren
              </UButton>
            </div>
          </template>
        </UCard>
      </UForm>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>

</style>
