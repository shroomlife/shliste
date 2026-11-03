<script setup lang="ts">
import { marketingStories } from '~/data/marketingStories'

const route = useRoute()
const story = computed(() => marketingStories.find(item => item.path === route.path.replace(/\/$/, '')))
if (!story.value) throw createError({ statusCode: 404, statusMessage: 'Diese Geschichte gibt es noch nicht.' })
</script>

<template>
  <MarketingStoryArticle
    v-if="story"
    :key="story.path"
    :story="story"
  />
</template>
