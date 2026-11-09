<script setup lang="ts">
import { createElement } from 'react'

import { createRoot, type Root } from 'react-dom/client'

import { Player, type PlayerRef } from '@remotion/player'

import { EverydayFilm } from '~/motion/EverydayFilm'

const props = withDefaults(defineProps<{ scene?: string }>(), { scene: 'recipe' })

const host = ref<HTMLElement>()

let root: Root | undefined

let player: PlayerRef | null = null

let observer: IntersectionObserver | undefined

let resize: ResizeObserver | undefined

let compact = false

function render() {
  root?.render(createElement(Player, { component: EverydayFilm, inputProps: { scene: props.scene }, durationInFrames: 360, fps: 30, compositionWidth: compact ? 620 : 1120, compositionHeight: compact ? 990 : 880, controls: true, autoPlay: false, loop: false, initialFrame: 30, style: { width: '100%' }, ref: (ref: PlayerRef | null) => {
    player = ref
  } }))
}

watch(host, (element) => {
  if (!element || root) return

  root = createRoot(element)

  compact = element.clientWidth < 600

  render()

  resize = new ResizeObserver(() => {
    const next = element.clientWidth < 600
    if (next !== compact) {
      compact = next
      render()
    }
  })

  resize.observe(element)

  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) player?.pause()
  })

  observer.observe(element)
}, { flush: 'post' })

watch(() => props.scene, () => {
  player?.pause()
  render()
  player?.seekTo(0)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  resize?.disconnect()
  root?.unmount()
})
</script>

<template>
  <div
    ref="host"
    class="film-player"
    aria-label="Abspielbare Animation eines vereinfachten shliste-Beispiels"
  />
</template>

<style scoped>
.film-player { overflow: hidden; border-radius: 24px; min-height: 240px; background: #fff8fc; }
</style>
