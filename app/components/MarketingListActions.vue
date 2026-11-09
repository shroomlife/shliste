<script setup lang="ts">
const props = withDefaults(defineProps<{ shared?: boolean, recipe?: boolean, title?: string, collapsed?: boolean, returnCue?: boolean, returnCueProgress?: number }>(), { shared: true, recipe: false, title: '', collapsed: false, returnCue: false, returnCueProgress: 0.35 })
// The Hero clock controls the entire tap cue, including a seek into its middle.
// There is no independent CSS clock to continue after playback has paused.
const returnTouchStyle = computed(() => {
  const progress = Math.max(0, Math.min(1, props.returnCueProgress))
  const rising = progress / 0.3
  const fading = (progress - 0.3) / 0.7
  const opacity = 0.8 * (progress < 0.3 ? rising : 1 - fading)
  const scale = progress < 0.3 ? 0.7 + 0.3 * rising : 1 + 0.15 * fading
  const radius = progress < 0.3 ? 4 * rising : 4 + 8 * fading
  return { opacity, scale, boxShadow: `0 0 0 ${radius}px color-mix(in srgb,var(--md-primary) 12%,transparent)` }
})
</script>

<template>
  <!-- BackButton.kt: separate detail actions beneath the global AppHeader. -->
  <div
    class="list-actions"
    aria-hidden="true"
  >
    <span class="list-back">
      <Transition :name="collapsed && title ? 'caption-rise' : 'caption-fall'">
        <span
          v-if="collapsed && title"
          key="title"
          class="back-caption back-caption--title"
        ><strong>{{ title }}</strong></span>
        <span
          v-else
          key="back"
          class="back-caption back-caption--normal"
        ><i style="--glyph:url('/images/brand/android-arrow-left.svg')" /><span class="back-full">Zurück zur Übersicht</span><span class="back-short">Zurück</span></span>
      </Transition>
      <span
        v-if="returnCue && collapsed && title"
        class="return-touch"
        :style="returnTouchStyle"
      />
    </span>
    <span class="list-action"><i :style="{ '--glyph': `url('/images/brand/android-${recipe ? 'edit' : 'history'}.svg')` }" /></span>
    <span class="list-action"><i style="--glyph:url('/images/brand/android-share.svg')" /></span>
    <span
      v-if="shared && !recipe"
      class="list-action"
    ><i style="--glyph:url('/images/brand/android-people.svg')" /></span>
  </div>
</template>

<style scoped>
.list-actions{position:relative;container-type:inline-size;display:flex;align-items:stretch;height:48px;min-height:48px;flex-shrink:0;box-sizing:border-box;color:var(--md-on-surface);font-family:var(--font-sans)}
.list-actions::after{content:'';position:absolute;inset:auto 0 0;height:1px;background:var(--md-secondary);pointer-events:none}
.list-back{position:relative;display:block;flex:1;min-width:0;overflow:hidden;font-size:16px;line-height:1.3}
.back-caption{position:absolute;inset:0;display:flex;align-items:center;min-width:0;white-space:nowrap}
.back-caption--normal{gap:6px;padding:0 12px;font-size:18px;line-height:20px}
.back-caption--normal>span{min-width:0;overflow:hidden;text-overflow:ellipsis;padding-top:2px}
.list-back .back-short{display:none}
/* CollapsingTitle.kt: a full, opaque gradient cell, no arrow or separate chip. */
.back-caption--title{padding:0 16px;background:linear-gradient(color-mix(in srgb,var(--md-primary) 20%,transparent),transparent),var(--md-surface)}
.back-caption--title>strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:20px;line-height:24px;font-weight:600}
.list-action{display:grid;place-items:center;width:48px;height:48px;flex:0 0 48px;box-sizing:border-box;border-left:1px solid var(--md-secondary);color:var(--md-primary)}
.list-actions i{width:20px;height:20px;flex-shrink:0;background:currentColor;mask:var(--glyph) center/contain no-repeat}
/* 400ms CSS approximation of Android's critical spring (stiffness 400, damping 1).
   Samples follow (1 - (1 + 20t) exp(-20t)), normalized at t = .4s. */
.list-actions{--caption-spring:linear(0 0%,.0617 5%,.1918 10%,.3384 15%,.4765 20%,.5958 25%,.6937 30%,.7713 35%,.8313 40%,.877 45%,.9112 50%,.9365 55%,.9552 60%,.9687 65%,.9785 70%,.9856 75%,.9907 80%,.9943 85%,.9969 90%,.9987 95%,1 100%)}
.caption-rise-enter-active,.caption-rise-leave-active,.caption-fall-enter-active,.caption-fall-leave-active{transition:opacity .4s var(--caption-spring),transform .4s var(--caption-spring)}
.caption-rise-enter-from,.caption-fall-leave-to{opacity:0;transform:translateY(50%)}
.caption-rise-leave-to,.caption-fall-enter-from{opacity:0;transform:translateY(-50%)}
.return-touch{position:absolute;left:28%;top:50%;width:18px;height:18px;border:1px solid var(--md-primary);border-radius:50%;background:color-mix(in srgb,var(--md-primary) 14%,transparent);pointer-events:none;transform:translate(-50%,-50%)}
@container(max-width:350px){.list-back .back-full{display:none}.list-back .back-short{display:inline}}
@container(max-width:260px){.list-back .back-short{display:none}}
@media(prefers-reduced-motion:reduce){.caption-rise-enter-active,.caption-rise-leave-active,.caption-fall-enter-active,.caption-fall-leave-active{transition:none}.return-touch{opacity:.55!important;scale:1!important;box-shadow:none!important}}
</style>
