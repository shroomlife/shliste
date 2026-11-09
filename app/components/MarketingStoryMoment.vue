<script setup lang="ts">
import { marketingMoments, type MarketingMomentKey } from '~/data/marketingMoments'

const props = defineProps<{ moment: MarketingMomentKey, article?: boolean, nextList?: boolean }>()
const content = computed(() => marketingMoments[props.moment])
const imageBase = computed(() => `/images/illustrations/${content.value.image}`)
const headingId = useId()
</script>

<template>
  <section
    class="story-moment"
    :class="{ 'story-moment--article': article, 'mkt-content': !article }"
    :aria-labelledby="headingId"
  >
    <div class="moment-layout">
      <figure class="moment-figure">
        <img
          :src="`${imageBase}.webp`"
          :srcset="`${imageBase}-small.webp 600w, ${imageBase}-medium.webp 960w, ${imageBase}.webp 1536w`"
          :sizes="article ? '(max-width: 900px) calc(100vw - 40px), (min-width: 1920px) 720px, 850px' : '(max-width: 900px) calc(100vw - 40px), (min-width: 1920px) 1120px, 66vw'"
          :alt="content.alt"
          width="1536"
          height="1024"
          loading="lazy"
          decoding="async"
        >
        <figcaption><MarketingAiLabel /></figcaption>
      </figure>
      <div class="moment-copy">
        <p class="moment-eyebrow">
          <span><UIcon :name="content.icon" /></span>{{ content.eyebrow }}
        </p>
        <h2 :id="headingId">
          {{ content.title }}
        </h2>
        <p class="moment-text">
          {{ content.text }}
        </p>
        <div class="moment-list">
          <h3>{{ content.listTitle }}</h3>
          <ul>
            <li
              v-for="item in content.items"
              :key="item"
            >
              <span
                class="moment-check"
                aria-hidden="true"
              ><UIcon name="i-lucide-check" /></span><span>{{ item }}</span>
            </li>
          </ul>
          <p>{{ content.note }}</p>
        </div>
        <a
          v-if="article && nextList"
          href="#ausprobieren"
          class="moment-link"
        ><span>Jetzt eure Einkaufsliste zusammenstellen</span><UIcon name="i-lucide-list-plus" /></a>
        <NuxtLink
          v-else-if="!article"
          :to="content.to"
          class="moment-link"
        ><span>{{ content.link }}</span><UIcon name="i-lucide-arrow-up-right" /></NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.story-moment{container-type:inline-size;margin-block:56px 72px;scroll-margin-top:110px;color:var(--md-on-surface)}
.moment-layout{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:center;gap:clamp(28px,4cqi,72px);padding:clamp(20px,2.4cqi,44px);border-radius:32px;background:color-mix(in srgb,var(--demo-soft) 27%,var(--md-surface));border:1px solid color-mix(in srgb,var(--demo-accent) 12%,transparent)}
.moment-figure{container:ai-image / inline-size;min-width:0;align-self:center;margin:0;position:relative}
.moment-figure img{display:block;width:100%;height:auto;aspect-ratio:3/2;border-radius:22px;box-shadow:0 18px 48px -34px #382b34aa}
.moment-figure figcaption{position:absolute;right:12px;bottom:12px;display:flex;font-size:11px;line-height:1.25}
.moment-figure figcaption>.iconify{width:16px;height:16px;flex:0 0 16px;color:var(--demo-accent)}
.moment-copy{min-width:0;padding-block:12px}
.moment-eyebrow{display:flex;align-items:center;gap:11px;font-size:14px;font-weight:700;line-height:1.4;color:var(--demo-accent);margin:0 0 20px}
.moment-eyebrow>span{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border-radius:13px;background:var(--demo-soft)}
.moment-eyebrow .iconify{width:22px;height:22px}
.moment-copy h2{font-size:clamp(30px,3.8cqi,54px);font-weight:850;letter-spacing:-.035em;line-height:1.08;text-wrap:balance;margin:0;max-width:13ch}
.moment-text{font-size:clamp(18px,1.5cqi,23px);line-height:1.65;margin:22px 0 0;max-width:43ch}
.moment-list{margin-top:24px;padding-top:20px;border-top:1px solid color-mix(in srgb,var(--demo-accent) 17%,transparent)}
.moment-list h3{font-size:14px;font-weight:700;line-height:1.4;color:var(--demo-accent);margin:0 0 13px}
.moment-list ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:10px 16px}
.moment-list li{display:flex;align-items:center;gap:8px;font-size:17px;line-height:1.4}
.moment-check{display:grid;place-items:center;width:24px;height:24px;flex:0 0 24px;border-radius:6px;background:var(--md-check-container,#e8f5ee);color:var(--md-check-content,#23755a)}
.moment-check>.iconify{width:16px;height:16px}
.moment-list>p{font-size:13px;line-height:1.5;margin:13px 0 0;color:var(--md-on-surface-variant)}
.moment-link{display:inline-flex;align-items:center;gap:10px;min-height:48px;margin-top:24px;font-size:17px;font-weight:700;line-height:1.4;color:var(--demo-accent);text-decoration:underline;text-decoration-color:transparent;text-underline-offset:5px;transition:text-decoration-color .2s}
.moment-link>.iconify{width:21px;height:21px;flex:0 0 21px}
.moment-link:hover{text-decoration-color:currentColor}
.moment-link:focus-visible{outline:2px solid var(--demo-accent);outline-offset:5px;border-radius:6px}
.story-moment--article{margin-block:44px;max-width:100%}
@container(min-width:1500px){.moment-layout{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}.moment-copy{padding-right:18px}}
@container(max-width:900px){.moment-layout{grid-template-columns:1fr;gap:24px;padding:24px}.moment-figure img{border-radius:18px}.moment-copy{padding:0 4px 4px}.moment-copy h2{max-width:22ch;font-size:clamp(30px,5.5cqi,42px)}.moment-text{max-width:60ch;font-size:19px}.moment-list ul{gap:10px 20px}.moment-eyebrow{margin-bottom:15px}}
@container(max-width:480px){.moment-layout{padding:14px;gap:22px;border-radius:24px}.moment-figure img{border-radius:15px}.moment-figure figcaption{font-size:11px;gap:6px;align-items:flex-start}.moment-figure figcaption>.iconify{width:14px;height:14px;flex-basis:14px}.moment-copy{padding:0 8px 10px}.moment-copy h2{font-size:32px;max-width:16ch}.moment-eyebrow{font-size:13px;gap:9px}.moment-eyebrow>span{width:36px;height:36px;flex-basis:36px;border-radius:12px}.moment-eyebrow .iconify{width:20px;height:20px}.moment-text{font-size:18px;margin-top:17px}.moment-list{margin-top:21px;padding-top:18px}.moment-list ul{display:grid;grid-template-columns:1fr;gap:9px}.moment-list li{font-size:17px}.moment-link{font-size:16px;margin-top:19px}}
@media(max-width:600px){.story-moment{margin-block:32px 44px}}
@media(prefers-reduced-motion:reduce){.moment-link{transition:none}}
</style>
