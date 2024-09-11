<script lang="ts" setup>
const productStore = useProductStore()
const products = computed(() => productStore.getProducts)

const tableUiConfig = {
  th: {
    size: 'text-lg',
  },
  td: {
    size: 'text-lg',
  },
}

const columns = ref([
  {
    key: 'name',
    label: 'Name',
  },
  {
    key: 'actions',
    label: '',
  },
])
</script>

<template>
  <div>
    <UTable
      :rows="products"
      :columns="columns"
      :ui="tableUiConfig"
    >
      <template #actions-data="{}">
        <UButton
          icon="i-ph-pencil-line"
          color="gray"
          size="sm"
        >
          <span class="hidden md:block">
            Bearbeiten
          </span>
        </UButton>
      </template>
    </UTable>
  </div>
</template>

<style lang="scss" scoped>

</style>
