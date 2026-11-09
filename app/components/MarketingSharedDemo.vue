<script setup lang="ts">
/**
 * Gemeinsam einkaufen — echte Emulator-Screenshots, animiert.
 * Zeigt Shared-Badge, „von Sam“ und Abhaken auf derselben Liste.
 */
type Phase = 'idle' | 'notice' | 'syncing' | 'checking' | 'synced'

const phase = ref<Phase>('idle')
const reduced = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
const timeouts: ReturnType<typeof setTimeout>[] = []

const shotOpen = '/images/screenshots/android-list-detail.png'
const shotChecked = '/images/screenshots/android-list-shared-checked.png'
const shotOverview = '/images/screenshots/android-lists.png'

function clearTimers() {
  if (timer) clearTimeout(timer)
  for (const t of timeouts) clearTimeout(t)
  timeouts.length = 0
  timer = null
}

function after(ms: number, fn: () => void) {
  timeouts.push(setTimeout(fn, ms))
}

function runCycle() {
  clearTimers()
  phase.value = 'idle'
  after(1200, () => {
    phase.value = 'notice'
  })
  after(3200, () => {
    phase.value = 'syncing'
  })
  after(4800, () => {
    phase.value = 'checking'
  })
  after(6800, () => {
    phase.value = 'synced'
  })
  timer = setTimeout(() => runCycle(), 9200)
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) {
    phase.value = 'synced'
    return
  }
  runCycle()
})

onBeforeUnmount(() => clearTimers())

const storeShot = computed(() =>
  phase.value === 'checking' || phase.value === 'synced' ? shotChecked : shotOpen,
)

const homeShot = computed(() => {
  if (phase.value === 'idle' || phase.value === 'notice') return shotOverview
  if (phase.value === 'synced') return shotChecked
  return shotOpen
})

const statusText = computed(() => {
  switch (phase.value) {
    case 'idle':
      return 'Geteilte Liste mit Personen-Icon und „2 neu“ von Sam.'
    case 'notice':
      return 'Zuhause: Sam hat Rucola ergänzt. Du siehst „von Sam“.'
    case 'syncing':
      return 'Abgleich … dieselbe Liste auf beiden Geräten.'
    case 'checking':
      return 'Rucola liegt im Korb und ist abgehakt.'
    case 'synced':
      return 'Zuhause sieht dasselbe Häkchen. Eine Liste.'
    default:
      return ''
  }
})

const homeLabel = computed(() => {
  if (phase.value === 'idle' || phase.value === 'notice') return 'Zuhause · Übersicht'
  return 'Zuhause · Sam'
})

const storeLabel = computed(() => 'Im Laden · Robin')
</script>

<template>
  <div
    class="shared-demo"
    role="img"
    :aria-label="`Animation: ${statusText}`"
  >
    <p
      class="shared-status"
      aria-live="polite"
    >
      <span
        class="shared-status-dot"
        :class="`is-${phase}`"
        aria-hidden="true"
      />
      {{ statusText }}
    </p>

    <div class="shared-stage">
      <!-- Zuhause -->
      <div class="device">
        <div class="device-tag">
          <UIcon
            name="i-lucide-home"
            class="size-3.5"
          />
          {{ homeLabel }}
        </div>
        <div
          class="device-frame"
          :class="{
            'device-frame--pulse': phase === 'notice' || phase === 'synced',
            'device-frame--dim': phase === 'checking',
          }"
        >
          <div class="device-screen">
            <Transition
              name="shot-fade"
              mode="out-in"
            >
              <img
                :key="homeShot"
                :src="homeShot"
                alt=""
                class="device-shot"
                width="360"
                height="780"
                decoding="async"
              >
            </Transition>
            <div
              v-if="phase === 'notice' || phase === 'syncing'"
              class="device-callout device-callout--home"
              aria-hidden="true"
            >
              <UIcon
                name="i-lucide-users"
                class="size-3.5"
              />
              von Sam
            </div>
          </div>
        </div>
      </div>

      <!-- Sync -->
      <div
        class="sync-rail"
        aria-hidden="true"
      >
        <div
          class="sync-orb"
          :class="{ 'sync-orb--active': phase === 'syncing' || phase === 'checking' }"
        >
          <UIcon
            name="i-lucide-refresh-cw"
            class="size-5"
          />
        </div>
        <span class="sync-label">
          {{ phase === 'syncing' ? 'Sync' : 'eine Liste' }}
        </span>
      </div>

      <!-- Laden -->
      <div class="device">
        <div class="device-tag device-tag--store">
          <UIcon
            name="i-lucide-shopping-cart"
            class="size-3.5"
          />
          {{ storeLabel }}
        </div>
        <div
          class="device-frame"
          :class="{
            'device-frame--pulse': phase === 'checking' || phase === 'synced',
          }"
        >
          <div class="device-screen">
            <Transition
              name="shot-fade"
              mode="out-in"
            >
              <img
                :key="storeShot"
                :src="storeShot"
                alt=""
                class="device-shot"
                width="360"
                height="780"
                decoding="async"
              >
            </Transition>
            <div
              v-if="phase === 'idle' || phase === 'notice' || phase === 'syncing'"
              class="device-spotlight"
              aria-hidden="true"
            />
            <div
              v-if="phase === 'checking'"
              class="device-callout device-callout--store"
              aria-hidden="true"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3.5"
              />
              abgehakt
            </div>
          </div>
        </div>
      </div>
    </div>

    <ul class="shared-beats">
      <li>
        <UIcon
          name="i-lucide-users"
          class="size-4"
        />
        Personen-Icon = geteilte Liste
      </li>
      <li>
        <UIcon
          name="i-lucide-user-round"
          class="size-4"
        />
        „von Sam“ = wer ergänzt hat
      </li>
      <li>
        <UIcon
          name="i-lucide-check-check"
          class="size-4"
        />
        Abhaken landet auf beiden Geräten
      </li>
    </ul>

    <p class="shared-footnote mkt-muted">
      Android-Aufnahmen aus dem Emulator mit Beispieldaten von Robin &amp; Sam.
      Native iOS-App folgt; auf dem iPhone kannst du die Web-App im Browser nutzen.
      Mit Anmeldung gleicht sich der Stand ab; ohne Empfang kannst du trotzdem abhaken.
    </p>
  </div>
</template>

<style scoped>
.shared-demo {
  margin-top: 1.75rem;
}

.shared-status {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.5rem;
  margin: 0 0 1.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--demo-accent);
  background: color-mix(in srgb, var(--md-primary-container) 80%, white);
  max-width: 100%;
  transition: background 300ms ease;
}
:global(.dark) .shared-status { color: var(--md-primary); }

.shared-status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}
.shared-status-dot.is-syncing,
.shared-status-dot.is-notice,
.shared-status-dot.is-checking {
  animation: status-pulse 1s ease-in-out infinite;
}
@keyframes status-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 40%, transparent); }
  50% { transform: scale(1.15); box-shadow: 0 0 0 6px transparent; }
}

.shared-stage {
  display: grid;
  gap: 1.25rem;
  align-items: start;
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .shared-stage {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.85rem;
  }
}

.device-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--demo-accent);
}
.device-tag--store { color: #2F6B4F; }
:global(.dark) .device-tag { color: var(--md-primary); }
:global(.dark) .device-tag--store { color: var(--md-tertiary, #7FD1AE); }

.device-frame {
  border-radius: 1.5rem;
  border: 5px solid color-mix(in srgb, var(--md-on-background) 88%, transparent);
  background: #0b1220;
  padding: 0.35rem;
  box-shadow: 0 18px 40px color-mix(in srgb, var(--md-primary) 14%, transparent);
  transition: box-shadow 400ms ease, transform 400ms ease, opacity 400ms ease;
  overflow: hidden;
}
.device-frame--pulse {
  box-shadow: 0 20px 48px color-mix(in srgb, var(--md-primary) 26%, transparent);
  transform: translateY(-3px);
}
.device-frame--dim {
  opacity: 0.72;
}

.device-screen {
  position: relative;
  border-radius: 1.1rem;
  overflow: hidden;
  background: #fff;
  aspect-ratio: 9 / 19.5;
}

.device-shot {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.shot-fade-enter-active,
.shot-fade-leave-active {
  transition: opacity 380ms ease, transform 380ms ease;
}
.shot-fade-enter-from {
  opacity: 0;
  transform: scale(1.02);
}
.shot-fade-leave-to {
  opacity: 0;
  transform: scale(0.99);
}

.device-spotlight {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 38%;
  height: 9%;
  border-radius: 0.75rem;
  border: 2px solid color-mix(in srgb, var(--demo-accent) 70%, white);
  box-shadow: 0 0 0 999px color-mix(in srgb, #0b1220 28%, transparent);
  pointer-events: none;
  animation: spotlight-in 520ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
}
@keyframes spotlight-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.device-callout {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: white;
  background: var(--demo-accent);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--demo-accent) 45%, transparent);
  animation: callout-pop 480ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  pointer-events: none;
}
.device-callout--home {
  left: 8%;
  top: 28%;
}
.device-callout--store {
  right: 8%;
  top: 42%;
  background: #2F6B4F;
  box-shadow: 0 8px 20px color-mix(in srgb, #2F6B4F 45%, transparent);
}
@keyframes callout-pop {
  0% { opacity: 0; transform: translateY(8px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.sync-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding-block: 0.5rem;
}
.sync-orb {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--demo-accent);
  background: color-mix(in srgb, var(--md-primary-container) 85%, white);
  border: 1px solid color-mix(in srgb, var(--md-primary) 18%, transparent);
}
.sync-orb--active {
  animation: spin-soft 1.1s linear infinite;
}
@keyframes spin-soft {
  to { transform: rotate(360deg); }
}
.sync-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-on-surface-variant);
}

.shared-beats {
  list-style: none;
  margin: 1.35rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
@media (min-width: 700px) {
  .shared-beats {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
}
.shared-beats li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0.65rem 0.8rem;
  border-radius: 0.85rem;
  font-size: 0.82rem;
  font-weight: 650;
  background: color-mix(in srgb, var(--md-surface-container) 88%, white);
  color: var(--md-on-surface);
}
.shared-beats :deep(svg) {
  color: var(--demo-accent);
  flex-shrink: 0;
}

.shared-footnote {
  margin-top: 1.1rem;
  font-size: 0.85rem;
  max-width: 40rem !important;
}

@media (prefers-reduced-motion: reduce) {
  .shared-status-dot,
  .sync-orb--active,
  .device-spotlight,
  .device-callout,
  .shot-fade-enter-active,
  .shot-fade-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
