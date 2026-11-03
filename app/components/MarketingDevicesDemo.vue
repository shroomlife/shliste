<script setup lang="ts">
import type { ListItem } from '#shared/types/domain'

const { style: paletteStyle, next: nextPalette } = useMarketingDemoPalette()
const root = ref<HTMLElement>()
const phase = ref(0)
const paused = ref(false)
const reduced = ref(false)
const visible = ref(false)
const activeTab = ref(true)
const running = computed(() => visible.value && activeTab.value && !paused.value && !reduced.value)
const steps = ['Robin schaut nach, was fehlt.', 'Robin schreibt Rucola auf die Liste.', 'Sam sieht den neuen Eintrag auf Android.', 'Sam legt Rucola in den Korb und hakt ab.', 'Auch bei Robin ist Rucola jetzt erledigt.']
const devices = [
  { id: 'browser', name: 'Robin', initial: 'R', location: 'zu Hause', platform: 'Browser / PWA', icon: 'i-lucide-monitor', palette: 2 },
  { id: 'android', name: 'Sam', initial: 'S', location: 'im Supermarkt', platform: 'Android-App', icon: 'i-lucide-smartphone', palette: 1 },
  { id: 'iphone', name: 'Ein Blick auf iOS', initial: 'i', location: 'Native Entwicklungsvorschau', platform: 'Native iOS-App', icon: 'i-lucide-smartphone', palette: 0 },
] as const
function hasRucola(id: string) {
  return phase.value >= (id === 'browser' ? 1 : 2)
}
function isChecked(id: string) {
  return phase.value >= (id === 'android' ? 3 : 4)
}
function changed(id: string) {
  return (id === 'android' && phase.value === 2) || (id === 'browser' && phase.value === 4)
}
function row(name: string, checked = false): ListItem {
  return { id: name, listId: 'device-demo', name, checked, quantity: 1, removed: false, orderIndex: 0, sortKey: null, url: null, linkTitle: null, linkImagePath: null, linkImageKind: null, linkPending: false, createdBy: null, modifiedBy: null, createdAt: '2026-11-02T12:00:00.000Z', updatedAt: '2026-11-02T12:00:00.000Z', deletedAt: null, fieldTimestamps: null }
}
function select(index: number) {
  phase.value = index
  paused.value = true
}
let timer: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
function updateMotion() {
  reduced.value = media?.matches ?? false
}
function updateVisibility() {
  activeTab.value = !document.hidden
}
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  updateVisibility()
  media.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  // Tall mobile figures should start as soon as their first device enters view.
  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting
  }, { threshold: 0.1 })
  if (root.value)
    observer.observe(root.value)
})
watch(running, (play) => {
  clearInterval(timer)
  if (play)
    timer = setInterval(() => {
      phase.value = (phase.value + 1) % steps.length
      if (phase.value === 0)
        nextPalette()
    }, 3400)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  observer?.disconnect()
  media?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <figure
    ref="root"
    class="devices-demo"
    :style="paletteStyle"
    :class="{ 'is-still': !running }"
    :data-phase="phase"
  >
    <div class="film-top">
      <span><UIcon name="i-lucide-users" /> Gemeinsam einkaufen. Auf euren Geräten.</span><button
        type="button"
        :disabled="reduced"
        :aria-label="paused ? 'Geräteanimation fortsetzen' : 'Geräteanimation pausieren'"
        @click="paused = !paused"
      >
        <UIcon :name="paused || reduced ? 'i-lucide-play' : 'i-lucide-pause'" />
      </button>
    </div>
    <div
      class="devices-stage"
      aria-hidden="true"
      inert
    >
      <div
        v-for="device in devices"
        :key="device.id"
        class="device-column"
        :class="`device-column--${device.id}`"
      >
        <div class="device-person">
          <span class="avatar optical-center"><UIcon
            v-if="device.id === 'iphone'"
            name="i-lucide-smartphone"
          /><template v-else>{{ device.initial }}</template></span><div><strong>{{ device.name }}</strong><small>{{ device.location }}</small></div>
        </div>
        <div
          class="device-shell"
          :class="[`device-shell--${device.id}`, { receiving: changed(device.id) }]"
        >
          <div
            v-if="device.id === 'browser'"
            class="browser-chrome"
          >
            <span class="window-dots"><i /><i /><i /></span><span class="address"><UIcon name="i-lucide-lock-keyhole" /> shliste.app</span>
          </div>
          <div
            v-else
            class="phone-chrome"
          >
            <span>9:41</span><i :class="device.id === 'iphone' ? 'island' : 'camera'" /><span><UIcon name="i-lucide-wifi" /><UIcon name="i-lucide-battery-full" /></span>
          </div>
          <MarketingIosOverview v-if="device.id === 'iphone'" />
          <div
            v-else
            class="device-app"
            :class="`device-app--${device.id}`"
          >
            <MarketingAppToolbar v-if="device.id === 'android'" />
            <MarketingListActions v-if="device.id === 'android'" />
            <div class="device-list-heading">
              <div class="device-title-row">
                <h3>Freitag mit Freunden</h3><template v-if="device.id === 'browser'">
                  <UIcon name="i-lucide-users" /><UIcon name="i-lucide-ellipsis-vertical" />
                </template>
              </div><div class="list-members">
                <UIcon name="i-lucide-users" /> Robin &amp; Sam
              </div>
            </div>
            <div class="device-list">
              <ListItemRow :item="row('Tomaten')" />
              <div
                class="device-row-slot"
                :class="{ 'tap-check': device.id === 'android' && phase === 3 }"
              >
                <Transition name="device-row">
                  <ListItemRow
                    v-if="hasRucola(device.id)"
                    :item="row('Rucola', isChecked(device.id))"
                    :just-changed="changed(device.id)"
                    :changed-by="phase === 4 ? 'Sam' : 'Robin'"
                  />
                </Transition>
              </div>
            </div>
            <MarketingListInputBar
              :platform="device.id === 'browser' ? 'web' : 'android'"
              :value="device.id === 'browser' && phase === 0 ? 'Rucola' : ''"
            />
          </div>
          <div
            v-if="device.id !== 'browser'"
            class="gesture-bar"
          />
        </div>
        <div class="device-platform">
          <UIcon :name="device.icon" /><span>{{ device.platform }}</span>
        </div>
        <div
          v-if="device.id === 'iphone'"
          class="device-sync"
        >
          <UIcon name="i-lucide-construction" /><span>Beispieldaten · Menü als Entwurf</span>
        </div>
        <div
          v-else
          class="device-sync"
        >
          <UIcon :name="isChecked(device.id) ? 'i-lucide-check-check' : hasRucola(device.id) ? 'i-lucide-check' : 'i-lucide-wifi'" /><span>{{ isChecked(device.id) ? 'Rucola ist erledigt' : hasRucola(device.id) ? 'Rucola steht auf der Liste' : 'Verbunden' }}</span>
        </div>
      </div>
    </div>
    <div class="film-story">
      <UIcon :name="phase === 4 ? 'i-lucide-circle-check' : 'i-lucide-arrow-right-left'" /><p aria-live="off">
        {{ steps[phase] }}
      </p>
    </div>
    <div
      class="film-controls"
      aria-label="Schritt der Geräteanimation auswählen"
    >
      <button
        v-for="(step, index) in steps"
        :key="step"
        type="button"
        :aria-label="step"
        :aria-pressed="phase === index"
        @click="select(index)"
      >
        <span class="optical-center">{{ index + 1 }}</span>
      </button>
    </div>
    <figcaption>Robin und Sam zeigen den Abgleich zwischen Browser und Android. Dafür braucht ihr Anmeldung und Internet. Daneben siehst du die Listenübersicht des nativen iOS-Builds. Sie arbeitet derzeit mit Beispieldaten und nimmt noch nicht am Abgleich teil. Der Menüknopf zeigt die geplante Ergänzung für iOS.</figcaption>
  </figure>
</template>

<style scoped>
.devices-demo{container-type:inline-size;background:#f7f3f5;border:1px solid color-mix(in srgb,var(--demo-accent) 10%,transparent);border-radius:32px;padding:22px 28px;color:#34232f;overflow:hidden}
.film-top{display:flex;align-items:center;justify-content:space-between;gap:16px;font-weight:700;font-size:17px}.film-top>span{display:flex;gap:9px;align-items:center}.film-top .iconify{width:20px;height:20px;color:var(--demo-accent)}.film-top button{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:white;cursor:pointer}.film-top button:disabled{opacity:.5;cursor:default}
.devices-stage{display:grid;grid-template-columns:1.18fr 1fr 1fr;align-items:start;gap:32px;padding:26px 4px 24px}.device-column{min-width:0;color:var(--md-on-surface)}
.device-person{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:18px}.avatar{display:grid;place-items:center;width:42px;height:42px;box-sizing:border-box;border-radius:50%;background:var(--demo-soft);color:var(--demo-accent);font-size:22px;line-height:1;font-weight:700}.device-person strong{display:block;font-size:18px;line-height:1.1}.device-person small{display:block;font-size:13px;color:var(--md-on-surface-variant);margin-top:3px}
.device-shell{background:var(--md-surface);border:3px solid color-mix(in srgb,var(--demo-accent) 23%,white);border-radius:30px;overflow:hidden;box-shadow:0 14px 28px -18px #53384d66;transition:border-color 1s,background 1s;position:relative}.device-shell--browser{border-radius:17px;margin-top:32px}.phone-chrome{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 7px;font-size:12px;line-height:1;position:relative}.phone-chrome>span:last-child{display:flex;gap:5px}.phone-chrome .iconify{width:15px;height:15px}.camera,.island{position:absolute;left:50%;transform:translateX(-50%);background:#302c30}.camera{width:9px;height:9px;border-radius:50%}.island{width:60px;height:17px;border-radius:20px}.browser-chrome{height:40px;display:flex;align-items:center;padding:9px;gap:10px;background:var(--demo-soft)}.window-dots{display:flex;gap:4px}.window-dots i{width:6px;height:6px;border-radius:50%;background:var(--demo-accent);opacity:.5}.address{display:flex;justify-content:center;align-items:center;gap:5px;background:var(--md-surface);border-radius:5px;flex:1;font-size:12px;line-height:22px}.address .iconify{width:11px;height:11px}
.device-app{padding:14px 12px}.app-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;color:var(--demo-accent)}.app-toolbar>.iconify{width:20px;height:20px}.device-wordmark{display:block;width:85px;height:27px;background:var(--md-primary);mask:url('/images/brand/wordmark.svg') center/contain no-repeat;transition:background 1s}.device-app h3{font-size:clamp(19px,2.1cqw,25px);font-weight:800;line-height:1.15;margin:0 0 8px}.list-members{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--md-on-surface-variant);margin-bottom:18px}.list-members .iconify{width:15px;height:15px}
.device-list{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;grid-template-rows:60px 60px}.device-row-slot{height:60px;min-width:0;position:relative}.device-list :deep(.min-h-15){height:60px;min-height:60px}.device-list :deep(button){line-height:1.15}.device-list :deep(.text-\[1\.25rem\]){font-size:18px}.device-list :deep(.text-\[0\.875rem\]){font-size:12px;line-height:15px}
.device-input{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--demo-soft);padding:12px;margin-top:18px;border-radius:10px;color:var(--md-on-surface-variant);font-size:15px}.device-input .iconify{width:20px;height:20px;color:var(--demo-accent)}.device-bottom-nav{display:flex;justify-content:space-around;gap:16px;margin-top:22px;font-size:12px;color:var(--md-on-surface-variant)}.device-bottom-nav span{display:flex;flex-direction:column;align-items:center;gap:4px}.device-bottom-nav span:first-child{color:var(--demo-accent)}.device-bottom-nav .iconify{width:19px;height:19px}.gesture-bar{height:4px;width:70px;background:var(--md-on-surface);opacity:.45;border-radius:4px;margin:6px auto 10px}
.device-platform{display:flex;justify-content:center;align-items:center;gap:7px;margin-top:20px;font-weight:700;font-size:15px}.device-platform .iconify{width:18px;height:18px}.device-sync{display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;min-height:26px;color:var(--md-on-surface-variant)}.device-sync .iconify{width:14px;height:14px}
.film-story{display:flex;justify-content:center;align-items:center;gap:9px;min-height:48px;color:#733259;text-align:center}.film-story>.iconify{width:20px;height:20px;flex-shrink:0}.film-story p{font-size:19px;line-height:1.35;margin:0}.film-controls{display:flex;justify-content:center;gap:6px;margin:10px 0}.film-controls button{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;cursor:pointer}.film-controls button>span{display:grid;place-items:center;box-sizing:border-box;width:34px;height:34px;border-radius:50%;background:#eae2e7;font-size:15px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums}.film-controls button[aria-pressed=true]>span{background:var(--demo-accent);color:white}.devices-demo button:focus-visible{outline:2px solid var(--demo-accent);outline-offset:2px}.devices-demo figcaption{max-width:680px;margin:0 auto;font-size:12px;line-height:1.5;color:#78616f;text-align:center}
.device-row-enter-active,.device-row-leave-active{transition:opacity .35s,transform .45s cubic-bezier(.2,.8,.2,1)}.device-row-enter-from{opacity:0;transform:translateY(10px)}.device-row-leave-to{opacity:0;transform:translateY(-6px)}.tap-check::after{content:'';position:absolute;right:26px;top:18px;width:24px;height:24px;border:2px solid #2d9c74;border-radius:50%;pointer-events:none;animation:check-touch .65s ease-out both}.is-still :deep(*){animation-play-state:paused!important}.is-still .tap-check::after{display:none}@keyframes check-touch{from{opacity:.8;transform:scale(.6)}to{opacity:0;transform:scale(2.3)}}
@container(max-width:850px){.devices-stage{gap:14px}.device-app{padding:12px 8px}.device-list :deep(.text-\[1\.25rem\]){font-size:16px}.device-platform{font-size:13px}.device-sync{font-size:11px}}
@container(max-width:640px){.devices-stage{grid-template-columns:minmax(0,1fr);gap:28px;padding-top:20px}.device-column{max-width:340px;width:100%;margin:auto}.device-person{justify-content:flex-start;margin-bottom:10px}.device-shell--browser{margin-top:0}.device-app{padding:12px 16px}.app-toolbar{margin-bottom:12px}.device-app h3{font-size:23px}.device-list :deep(.text-\[1\.25rem\]){font-size:18px}.device-platform{margin-top:12px;font-size:15px}.device-sync{font-size:13px}.film-story{align-items:flex-start}.film-story p{font-size:17px}.device-bottom-nav{margin-top:14px}.devices-demo figcaption{font-size:12px}}
@media(max-width:600px){.devices-demo{padding:16px;border-radius:24px}.film-top{font-size:15px}}
@media(prefers-reduced-motion:reduce){.devices-demo :deep(*){transition:none!important;animation:none!important}.tap-check::after{display:none}}

.devices-demo{background:var(--demo-canvas);color:var(--md-on-surface);transition:background .6s}.film-top,.film-story{color:var(--demo-accent)}
.devices-stage{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.device-app{padding:0;display:flex;flex-direction:column;min-height:465px}.device-app--browser{min-height:340px}.device-list-heading{padding:20px 16px 10px;background:linear-gradient(var(--demo-soft),transparent)}.device-title-row{display:flex;align-items:flex-start;gap:8px}.device-title-row h3{flex:1}.device-title-row>.iconify{width:20px;height:20px;flex-shrink:0;margin-top:4px}.list-members{margin-bottom:4px}.device-list{padding:0 12px;margin-bottom:24px}.device-app>.list-input-bar{margin-top:auto}.avatar>.iconify{width:22px;height:22px}.device-column--iphone .device-person{justify-content:center}.device-column--iphone .device-shell{border-style:solid}
@container(max-width:900px){.devices-stage{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}.device-column--iphone{grid-column:1/-1;width:320px;max-width:100%;justify-self:center}.device-app{min-height:440px}.device-app--browser{min-height:340px}}
@container(max-width:640px){.devices-stage{grid-template-columns:minmax(0,1fr)}.device-column--iphone{grid-column:auto}.device-app{padding:0}.device-list-heading h3{font-size:24px}.device-app--browser{min-height:340px}}
</style>
