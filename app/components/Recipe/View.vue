<script lang="ts" setup>
const { recipe } = defineProps({
  recipe: {
    type: Object as PropType<Recipe>,
    required: true,
  },
})

const computedCardUi = computed(() => ({
  header: {
    padding: 'sm:px-0 p-0',
  },
}))

const computedFlatListStyle = computed(() => {
  return {
    backgroundColor: String(recipe.color).replace('0.2', '0.05'),
  }
})
</script>

<template>
  <div
    class="flex flex-col gap-6"
  >
    <UCard :ui="computedCardUi">
      <template #header>
        <div
          class="flex justify-between items-center sm:px-6 p-4 rounded-t-lg"
          :style="computedFlatListStyle"
        >
          <div class="flex justify-between items-center">
            <span class="text-2xl md:text-3xl font-bold">Zutaten</span>
            <div />
          </div>
        </div>
      </template>

      <div>
        <p
          v-if="recipe.products.length === 0"
          class="text-gray-500"
        >
          Keine Zutaten
        </p>
        <ul
          v-else
          class="list-inside list-disc text-lg"
        >
          <li
            v-for="product of recipe.products"
            :key="product.uuid"
          >
            {{ product.name }}
          </li>
        </ul>
      </div>
    </UCard>
    <UCard :ui="computedCardUi">
      <template #header>
        <div
          class="flex justify-between items-center sm:px-6 p-4 rounded-t-lg"
          :style="computedFlatListStyle"
        >
          <span class="text-2xl md:text-3xl font-bold">Zubereitung</span>
        </div>
      </template>

      <div>
        <p
          v-if="recipe.steps.length === 0"
          class="text-gray-500"
        >
          Keine Zubereitungsschritte
        </p>
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <p
            v-for="(step, index) of recipe.steps"
            :key="index"
            class="text-lg"
          >
            <span class="font-bold text-2xl">{{ index+1 }}.</span>
            <span class="ms-2">{{ step }}</span>
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style lang="scss" scoped>

</style>
