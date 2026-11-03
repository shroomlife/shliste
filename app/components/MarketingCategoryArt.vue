<script setup lang="ts">
defineProps<{
  category: 'everyday' | 'guides' | 'help'
}>()
</script>

<template>
  <div
    class="category-art"
    :class="`category-art--${category}`"
    aria-hidden="true"
    inert
  >
    <template v-if="category === 'everyday'">
      <img
        class="dinner-art"
        src="/images/alltag/gaeste-zum-essen-v2.webp"
        alt=""
        width="1200"
        height="800"
        loading="lazy"
      ><span class="art-label">Illustration KI-generiert</span><div class="table-note">
        <span>Freitag, 19:30</span><strong>Alle da. <br>Lasagne auch.</strong><UIcon name="i-lucide-heart" />
      </div>
    </template>
    <template v-else-if="category === 'guides'">
      <img
        class="category-cake"
        src="/images/recipes/marmorkuchen.webp"
        alt=""
        width="600"
        height="400"
        loading="lazy"
      ><div class="category-paper">
        <span>Omas Marmorkuchen</span><i /><p>250 g Mehl<br>200 g Zucker<br>4 Eier</p><small>Rezeptauszug als Beispiel</small>
      </div><div class="category-phone">
        <div class="category-camera" /><MarketingAppToolbar /><div class="category-recipe">
          <img
            src="/images/recipes/marmorkuchen.webp"
            alt=""
            width="600"
            height="400"
            loading="lazy"
          ><strong>Omas Marmorkuchen</strong><span>Zutaten &amp; Zubereitung</span><div><UIcon name="i-lucide-check" />Beim nächsten Mal wiederfinden</div>
        </div><i class="category-gesture" />
      </div><span class="category-sticker"><UIcon name="i-lucide-camera" />Ein Foto. Dein Rezept.</span>
    </template>
    <template v-else>
      <div class="help-orbit" /><div class="help-orbit second" /><img
        class="help-illustration"
        src="/images/alltag/offline-einkaufen-v2-small.webp"
        alt=""
        width="600"
        height="400"
        loading="lazy"
      ><div class="connection-card">
        <UIcon name="i-lucide-wifi-off" /><strong>Kein Empfang?</strong><span>Deine gespeicherte Liste ist da.</span><div><UIcon name="i-lucide-check" />Brot ist im Korb.</div>
      </div><span class="art-label">Illustration KI-generiert</span>
    </template>
  </div>
</template>

<style scoped>
.category-art{height:390px;position:relative;isolation:isolate;border-radius:30px;overflow:hidden;background:#efe9db;color:var(--md-on-surface)}.dinner-art{width:100%;height:100%;object-fit:cover}.art-label{position:absolute;right:14px;bottom:13px;background:#fffaf0e8;padding:5px 9px;border-radius:10px;font-size:11px;color:#58423a}.table-note{position:absolute;right:24px;top:24px;padding:18px 22px;background:#fffaf3ed;border-radius:3px 3px 18px 3px;rotate:5deg;box-shadow:0 14px 25px -20px #46302166}.table-note>span{font-size:12px;color:#80664c}.table-note>strong{display:block;font-size:27px;line-height:1.1;margin-top:8px}.table-note>.iconify{position:absolute;width:20px;height:20px;color:var(--demo-accent);right:14px;bottom:12px}
.category-art--guides{background:linear-gradient(135deg,#f4e8e0,var(--demo-soft))}.category-cake{position:absolute;left:-26px;top:-35px;width:270px;height:235px;object-fit:cover;border-radius:50%;rotate:-12deg}.category-paper{position:absolute;left:26px;bottom:30px;background:#fff9e9;color:#594638;border-radius:4px;padding:20px;rotate:-8deg;box-shadow:0 12px 25px -15px #6c3e3f44;width:180px}.category-paper>span{font-family:Georgia,serif;font-size:18px;line-height:1.2;display:block}.category-paper>i{height:1px;display:block;background:#d7c2a9;margin:15px 0}.category-paper>p{font-size:18px;line-height:1.5}.category-paper>small{font-size:10px;display:block;margin-top:12px}.category-phone{position:absolute;right:26px;top:34px;width:228px;background:var(--md-surface);border:5px solid #e1d8df;box-shadow:0 22px 30px -20px #3a253c66;border-radius:28px;overflow:hidden;rotate:7deg}.category-camera{width:7px;height:7px;background:#382c32;border-radius:50%;margin:8px auto}.category-phone :deep(.native-toolbar){min-height:52px}.category-phone :deep(.native-wordmark){width:100px}.category-recipe{padding:12px}.category-recipe>img{width:100%;height:105px;object-fit:cover;border-radius:9px}.category-recipe>strong{display:block;font-size:22px;line-height:1.1;margin:15px 0 7px}.category-recipe>span{font-size:13px;color:var(--md-on-surface-variant)}.category-recipe>div{display:flex;align-items:center;gap:6px;font-size:13px;line-height:1.2;margin-top:15px;color:var(--md-check-content)}.category-recipe .iconify{width:18px;height:18px;flex-shrink:0}.category-gesture{display:block;height:3px;width:60px;background:var(--md-on-surface);opacity:.5;border-radius:4px;margin:6px auto 8px}.category-sticker{display:flex;align-items:center;gap:7px;position:absolute;left:21px;top:28px;border-radius:20px;background:var(--md-surface);padding:10px 14px;font-size:15px;font-weight:700;color:var(--demo-accent);rotate:-5deg}.category-sticker>.iconify{width:20px;height:20px;flex-shrink:0}
.category-art--help{background:#e8eee3}.help-orbit{position:absolute;width:340px;height:340px;border:1px solid #6f86623a;border-radius:50%;left:-80px;top:-50px}.help-orbit.second{width:480px;height:480px;left:-150px;top:-120px}.help-illustration{position:absolute;width:320px;height:300px;object-fit:cover;border-radius:50% 50% 30% 40%;left:-20px;top:32px}.connection-card{position:absolute;right:26px;bottom:45px;width:245px;padding:22px;background:#fcfff8f2;border-radius:23px;box-shadow:0 15px 30px -20px #40573655;rotate:4deg}.connection-card>.iconify{width:30px;height:30px;color:#6a7e57;margin-bottom:12px}.connection-card>strong{display:block;font-size:28px;line-height:1.15}.connection-card>span{display:block;font-size:16px;line-height:1.4;margin-top:10px}.connection-card>div{display:flex;align-items:center;gap:7px;border-top:1px solid #acbba366;margin-top:20px;padding-top:13px;font-size:18px;color:#47754f}.connection-card>div>.iconify{width:20px;height:20px}
@media(max-width:600px){.category-art{height:340px;border-radius:23px}.category-phone{width:204px;right:18px;top:20px}.category-phone :deep(.native-wordmark){width:92px}.category-paper{width:150px;padding:16px;left:18px;bottom:25px}.category-paper>span{font-size:16px}.category-paper>p{font-size:16px}.category-cake{width:225px;height:200px}.category-sticker{top:20px;left:13px;font-size:13px;padding:8px 11px}.connection-card{right:20px;bottom:27px;width:218px;padding:19px}.help-illustration{width:280px;height:280px}.table-note{right:17px;top:17px;padding:16px}.table-note>strong{font-size:25px}}
@media(max-width:380px){.category-phone{right:12px;width:180px;rotate:5deg}.category-recipe>img{height:85px}.category-recipe>strong{font-size:20px}.category-paper{left:12px;width:134px;padding:13px;bottom:22px}.category-sticker{max-width:150px;line-height:1.2}.category-art--guides{height:330px}.connection-card{width:195px;right:15px}.help-illustration{left:-60px}.category-art--help{height:320px}}
</style>

<style scoped>
/* Let the illustration define its frame. A fixed stage with contain produced side gutters. */
.category-art--everyday{height:auto;padding:0;background:#f7f0e4;display:flex;flex-direction:column}.category-art--everyday .dinner-art{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;flex-shrink:0}.category-art--everyday .table-note{position:static;display:grid;grid-template-columns:auto minmax(0,1fr) 20px;align-items:center;gap:14px;padding:16px 22px;rotate:0deg;border-radius:0;background:none;box-shadow:none}.category-art--everyday .table-note>strong{font-size:23px;line-height:1.2;margin:0;min-width:0}.category-art--everyday .table-note>strong>br{display:none}.category-art--everyday .table-note>.iconify{position:static;margin:0;width:20px;height:20px}.category-art--everyday .art-label{bottom:auto;top:12px;left:auto;right:12px;background:#fffaf0e8}
@media(max-width:600px){.category-art--everyday .table-note{padding:14px 16px;gap:7px 12px;grid-template-columns:minmax(0,1fr) 20px}.category-art--everyday .table-note>span{grid-column:1;font-size:12px;line-height:1.3}.category-art--everyday .table-note>strong{grid-column:1;font-size:20px}.category-art--everyday .table-note>.iconify{grid-column:2;grid-row:1/3}}
</style>

<style scoped>
@media(max-width:380px){.category-phone{transform:scale(.9);transform-origin:top right}}
</style>
