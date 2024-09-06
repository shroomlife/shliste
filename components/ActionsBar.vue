<script lang="ts" setup>
const listStore = useListStore()

const isFooterHidden = ref(false) // Controls the visibility of the footer
const lastScrollPosition = ref(0) // Track the last known scroll position

const handleScroll = () => {
  const currentScrollPosition = window.scrollY

  if (currentScrollPosition > lastScrollPosition.value) {
    isFooterHidden.value = true
  }
  else {
    isFooterHidden.value = false
  }

  lastScrollPosition.value = currentScrollPosition
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <section :class="{ hidden: isFooterHidden }">
    <div class="container">
      <div class="row">
        <div class="col actions-bar">
          <UButton
            class="shadow-lg"
            icon="i-ph-plus-circle-fill"
            size="xl"
            color="pink"
            square
            variant="solid"
            @click="listStore.addNewList"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
section {
  display: block;
  width: 100vw;
  height: fit-content;
  position: fixed;
  bottom: 0;
  transition: transform 0.3s ease-out; // Smooth transition for sliding

  &.hidden {
    transform: translateY(100%);  // Slide down to hide
  }

  .actions-bar {
    display: flex;
    justify-content: flex-end;
    padding-bottom: 12px;
    padding-right: 12px;
  }
}
</style>
