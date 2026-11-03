<script setup lang="ts">
// Native Compose Multiplatform shell: SharedScreens.kt and DemoContent.kt.
// This is a development preview, not a third participant in live sync.
const lists = [
  { name: 'Freitag · Freunde zum Essen', count: '2/8 Einträge', progress: 25, shared: true, secret: false, color: '#E064B2' },
  { name: 'Kühlschrank-Notstand', count: '1/6 Einträge', progress: 100 / 6, shared: false, secret: false, color: '#7FD1AE' },
  { name: 'Drogerie (nur für mich)', count: '3 Einträge', progress: 0, shared: false, secret: true, color: '#8B7EC8' },
]
</script>

<template>
  <div class="ios-overview">
    <MarketingAppToolbar platform="ios" />
    <div class="ios-lists">
      <h3>Deine Listen</h3><p>Vorschau mit Beispieldaten</p><div
        v-for="list in lists"
        :key="list.name"
        class="ios-list-card"
        :style="{ '--list-accent': list.color }"
      >
        <div>
          <strong>{{ list.name }}</strong><svg
            v-if="list.shared || list.secret"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="ios-glyph"
          ><path
            v-if="list.secret"
            d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9Zm9 14H6V10h12Zm-6-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
          /><path
            v-else
            d="M9 13c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4Zm-6 5v-1c0-.72 3.08-2 6-2s6 1.28 6 2v1ZM9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 7c2.31.44 6 1.71 6 4v3h-4v-2h2v-1c0-.54-1.71-1.52-4-2Zm0-9a4 4 0 0 1 0 8v-2a2 2 0 0 0 0-4Z"
          /></svg>
        </div><small>{{ list.count }}<span v-if="list.shared">1 mit</span></small><div class="ios-progress">
          <span :style="{ width: `${list.progress}%` }" />
        </div>
      </div>
    </div>
    <div class="ios-navigation">
      <span class="selected"><i><svg
        viewBox="0 0 24 24"
        fill="currentColor"
        class="ios-glyph"
      ><path d="M22 7h-9v2h9V7Zm0 8h-9v2h9v-2ZM5.54 11 2 7.46l1.41-1.41 2.13 2.12L9.78 3.93l1.41 1.41L5.54 11Zm0 8L2 15.46l1.41-1.41 2.13 2.12 4.24-4.24 1.41 1.41L5.54 19Z" /></svg></i><b>Listen</b></span><span><i><svg
        viewBox="0 0 24 24"
        fill="currentColor"
        class="ios-glyph"
      ><path d="M11 9H9V2H7v7H5V2H3v7a4 4 0 0 0 3 3.87V22h2v-9.13A4 4 0 0 0 11 9V2H9v7Zm5-7c-1 0-3 2-3 6v5h3v9h2V2h-2Z" /></svg></i><b>Rezepte</b></span>
    </div>
  </div>
</template>

<style scoped>
.ios-overview{font-family:Roboto,Arial,sans-serif;background:var(--md-surface);color:var(--md-on-surface)}.ios-lists{padding:16px;display:grid;gap:12px}.ios-lists h3{font-size:16px;font-weight:700;line-height:24px;margin:0}.ios-lists>p{font-size:12px;line-height:16px;color:var(--md-on-surface-variant);margin:-8px 0 4px}.ios-list-card{padding:18px;border-radius:20px;background:linear-gradient(color-mix(in srgb,var(--list-accent) 28%,var(--md-surface)),var(--md-surface-container))}.ios-list-card>div{display:flex;align-items:center;gap:8px}.ios-list-card strong{font-size:20px;line-height:1.2;font-weight:700;flex:1;min-width:0}.ios-list-card .ios-glyph{width:28px;height:28px;flex-shrink:0;color:var(--md-primary)}.ios-list-card small{display:flex;gap:8px;font-size:14px;line-height:20px;color:var(--md-primary);margin-top:8px}.ios-navigation{height:80px;background:var(--md-surface-container);display:flex;justify-content:space-around;align-items:center}.ios-navigation>span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px}.ios-navigation i{display:grid;place-items:center;width:64px;height:32px;border-radius:20px}.ios-navigation .selected i{background:var(--md-secondary-container)}.ios-navigation .ios-glyph{width:24px;height:24px}.ios-navigation b{font-weight:500}
.ios-list-card>.ios-progress{height:4px;border-radius:4px;background:var(--md-outline-variant);overflow:hidden;margin-top:10px}.ios-progress>span{display:block;height:100%;background:var(--md-primary)}
</style>
