<script setup lang="ts">
const route = useRoute()
await navigateTo({ path: '/warteliste', query: route.query, hash: route.hash }, { replace: true, redirectCode: 301 })
</script>

<template>
  <span />
</template>
