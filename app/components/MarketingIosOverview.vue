<script setup lang="ts">
// Mirrors the local Compose Multiplatform shell, including Android's original assets.
const lists = [
  { name: 'Freitag mit Freunden', count: '2/8 Einträge', progress: 25, shared: true, secret: false, color: '#E064B2' },
  { name: 'WG-Basics', count: '1/6 Einträge', progress: 100 / 6, shared: false, secret: false, color: '#7FD1AE' },
  { name: 'Ideen für Samstag', count: '3 Einträge', progress: 0, shared: false, secret: true, color: '#8B7EC8' },
]
</script>

<template>
  <div class="ios-overview">
    <MarketingAppToolbar platform="ios" />
    <div class="ios-lists">
      <div
        v-for="list in lists"
        :key="list.name"
        class="ios-list-card"
        :style="{ '--list-accent': list.color }"
      >
        <div class="ios-card-heading">
          <strong>{{ list.name }}</strong><i
            v-if="list.shared || list.secret"
            class="ios-glyph"
            :class="{ 'ios-lock': list.secret }"
          />
        </div>
        <small :class="{ 'has-progress': list.progress > 0 }">{{ list.count }}</small>
        <div
          v-if="list.progress > 0"
          class="ios-progress"
        >
          <span :style="{ width: list.progress + '%' }" />
        </div>
      </div>
    </div>
    <MarketingAppBottomBar />
  </div>
</template>

<style scoped>
.ios-overview{display:flex;flex-direction:column;min-height:465px;background:var(--md-surface);color:var(--md-on-surface)}.ios-lists{padding:16px;display:grid;gap:12px;flex:1;align-content:start}
.ios-list-card{padding:16px;border-radius:16px;background:linear-gradient(color-mix(in srgb,var(--list-accent) 20%,transparent),transparent),var(--md-surface);box-shadow:0 2px 4px #30203020;display:flex;flex-direction:column;gap:6px}
.ios-card-heading{display:flex;align-items:center;gap:8px}.ios-list-card strong{font-size:22px;line-height:26px;font-weight:700;flex:1;min-width:0;overflow-wrap:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.ios-list-card .ios-glyph{display:block;width:24px;height:24px;flex-shrink:0;background:var(--md-primary);mask:url('/images/brand/android-people.svg') center/contain no-repeat}.ios-list-card .ios-lock{mask-image:url('/images/brand/android-lock-private.svg')}
.ios-list-card small{font-size:16px;line-height:20px;color:var(--md-on-surface)}.ios-list-card small.has-progress{color:var(--md-primary)}
.ios-progress{height:4px;border-radius:2px;background:var(--md-surface-variant);overflow:hidden}.ios-progress>span{display:block;height:100%;background:var(--md-primary)}
</style>
