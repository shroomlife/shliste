<script setup lang="ts">
import MarketingMysticAura from '~/components/MarketingMysticAura.vue'
import RecipeBadgeConfetti from '~/components/RecipeBadgeConfetti.vue'
import { trackEvent } from '~/utils/googleAnalytics'

useSeoMeta({ title: 'Warteliste · shliste Premium', description: 'Zum Start der KI-Funktionen Bescheid bekommen. Trag dich mit deiner E-Mail in die Warteshliste ein.' })
const router = useRouter()
const email = ref('')
const consent = ref(false)
const busy = ref(false)
const error = ref('')
const token = ref('')
const resendSeconds = ref(0)
const ready = ref(false)
const celebrating = ref(false)
const browserKey = 'shliste:waitlist:v1'
const linkLifetime = 48 * 60 * 60 * 1000
type SavedState = { state: 'pending' | 'confirmed' | 'withdrawn', savedAt: number }
let localState: SavedState | undefined
let resendTimer: ReturnType<typeof setInterval> | undefined
let celebrationTimer: ReturnType<typeof setTimeout> | undefined

function beginResendCooldown(savedAt: number) {
  clearInterval(resendTimer)
  const update = () => {
    resendSeconds.value = Math.max(0, Math.ceil((savedAt + 15 * 60_000 - Date.now()) / 1000))
    if (!resendSeconds.value) clearInterval(resendTimer)
  }
  update()
  if (resendSeconds.value) resendTimer = setInterval(update, 1000)
}
const resendLabel = computed(() => `Erneut anfordern in ${Math.floor(resendSeconds.value / 60)}:${String(resendSeconds.value % 60).padStart(2, '0')}`)
const state = ref<'form' | 'pending' | 'confirm' | 'confirmed' | 'unsubscribe' | 'withdrawn'>('form')
const loadingLabel = computed(() => {
  if (!ready.value) return 'Warteliste wird geladen …'
  if (!busy.value) return ''
  if (state.value === 'confirm') return 'Anmeldung wird bestätigt …'
  if (state.value === 'unsubscribe') return 'Wird abgemeldet …'
  return 'Mail wird angefordert …'
})
const resultHeading = useTemplateRef<HTMLElement>('resultHeading')
const card = useTemplateRef<HTMLElement>('card')

function remember(next: SavedState['state']) {
  localState = { state: next, savedAt: Date.now() }
  try {
    localStorage.setItem(browserKey, JSON.stringify(localState))
  }
  catch { /* The current visit still works when browser storage is disabled. */ }
  return localState.savedAt
}

function readSavedState() {
  try {
    const raw = localStorage.getItem(browserKey)
    const saved = raw && JSON.parse(raw) as SavedState | null
    if (saved && ['pending', 'confirmed', 'withdrawn'].includes(saved.state) && Number.isFinite(saved.savedAt)) {
      localState = saved
    }
  }
  catch { /* Fall back to the state held by this page. */ }
  if (localState?.state === 'pending' && Date.now() - localState.savedAt >= linkLifetime) return undefined
  return localState
}

async function clearMailLink() {
  token.value = ''
  if (/^#(?:bestaetigen|abmelden)=/.test(location.hash)) {
    const { path, query } = router.currentRoute.value
    await router.replace({ path, query, hash: '' })
  }
}

function restore() {
  if (busy.value) return
  const match = location.hash.match(/^#(bestaetigen|abmelden)=([A-Za-z0-9_-]{43})$/)
  if (match) {
    const changed = token.value !== match[2]
    token.value = match[2]!
    state.value = match[1] === 'abmelden' ? 'unsubscribe' : 'confirm'
    if (changed) {
      error.value = ''
      void nextTick(() => card.value?.scrollIntoView({ block: 'start' }))
    }
    return
  }
  const saved = readSavedState()
  if (saved?.state !== state.value) error.value = ''
  state.value = saved?.state ?? 'form'
  token.value = ''
  if (saved?.state === 'pending') beginResendCooldown(saved.savedAt)
  else if (saved) email.value = ''
}

function onStorage(event: StorageEvent) {
  if (event.key === browserKey && !location.hash) restore()
}

onMounted(() => {
  restore()
  ready.value = true
  window.addEventListener('pageshow', restore)
  window.addEventListener('hashchange', restore)
  window.addEventListener('storage', onStorage)
})
onUnmounted(() => {
  clearInterval(resendTimer)
  clearTimeout(celebrationTimer)
  window.removeEventListener('pageshow', restore)
  window.removeEventListener('hashchange', restore)
  window.removeEventListener('storage', onStorage)
})

async function act(action: 'subscribe' | 'confirm' | 'unsubscribe') {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ alreadyConfirmed?: boolean }>(`/api/waitlist/${action}`, { method: 'POST', body: action === 'subscribe' ? { email: email.value.trim(), consent: consent.value, consentVersion: '2026-11-06' } : { token: token.value } })
    const next = action === 'subscribe' ? 'pending' : action === 'confirm' ? 'confirmed' : 'withdrawn'
    const savedAt = remember(next)
    if (action === 'subscribe') beginResendCooldown(savedAt)
    else await clearMailLink()
    // Nur der Schritt, nie die E-Mail. Ohne Zustimmung tut trackEvent nichts.
    if (action === 'subscribe') trackEvent('generate_lead', { location: 'warteliste' })
    if (action === 'confirm' && !result.alreadyConfirmed) {
      trackEvent('waitlist_confirm')
      clearTimeout(celebrationTimer)
      celebrating.value = true
      celebrationTimer = setTimeout(() => {
        celebrating.value = false
      }, 2300)
    }
    state.value = next
    void refreshNuxtData('ai-access')
  }
  catch (cause: unknown) {
    const status = (cause as { statusCode?: number }).statusCode
    error.value = status === 429 ? 'Du hast bereits eine Mail angefordert. Bitte versuche es später noch einmal.' : action !== 'subscribe' && status === 400 ? 'Dieser Link ist nicht mehr gültig. Wenn du deine E-Mail schon bestätigt hast, stehst du auf der Liste.' : 'Das hat gerade nicht geklappt. Deine Eingaben bleiben erhalten. Bitte versuche es noch einmal.'
  }
  finally { busy.value = false }
}
async function startAgain() {
  await clearMailLink()
  state.value = 'form'
  error.value = ''
}
</script>

<template>
  <MarketingChrome>
    <div class="waitlist-scenery">
      <MarketingMysticAura />
      <main
        id="inhalt"
        class="mkt-shell waitlist-page"
      >
        <div class="waitlist-story">
          <NuxtLink
            to="/?view=website"
            class="waitlist-back"
          ><UIcon name="i-lucide-arrow-left" />Zur Startseite</NuxtLink>
          <p class="mkt-label waitlist-eyebrow">
            Ein kleiner Ausblick
          </p>
          <PremiumComingSoonBadge variant="hero" />
          <h1>Deine Ideen.<br><span>Bald noch leichter.</span></h1>
          <p class="waitlist-intro">
            Mehr Zeit für das, was du gerne machst. Wir arbeiten an kleinen Helfern für deinen Einkauf und deine Lieblingsrezepte.
          </p>
          <div class="waitlist-promises">
            <div class="waitlist-feature">
              <span class="waitlist-feature-icon"><UIcon name="i-lucide-mic" /></span><div><strong>Ein Gedanke. Schon auf der Liste.</strong><p>Sprich aus, was beim nächsten Einkauf mit soll.</p></div>
            </div>
            <div class="waitlist-feature">
              <span class="waitlist-feature-icon"><UIcon name="i-lucide-camera" /></span><div><strong>Ein Fundstück. Dein nächstes Essen.</strong><p>Mach aus einem Rezeptfoto eine Idee zum Nachkochen.</p></div>
            </div>
            <div class="waitlist-feature">
              <span class="waitlist-feature-icon"><UIcon name="i-lucide-image" /></span><div><strong>Dein Rezept. Mit eigenem Look.</strong><p>Lass ein passendes Bild für deine Sammlung gestalten.</p></div>
            </div>
          </div>
          <p class="waitlist-note">
            Wir geben den letzten Details noch etwas Zeit. Du bekommst zum Start eine Nachricht und kannst dann in Ruhe entscheiden.
          </p>
        </div>
        <p
          class="sr-only"
          role="status"
        >
          {{ loadingLabel }}
        </p>
        <section
          id="warteliste-anmeldung"
          ref="card"
          class="waitlist-card"
          aria-label="Warteliste"
          :aria-busy="busy || !ready"
        >
          <div
            v-if="!ready"
            class="waitlist-skeleton"
            aria-hidden="true"
          >
            <div class="waitlist-emblem">
              <span class="waitlist-letter"><UIcon name="i-lucide-mail" /></span>
              <span class="waitlist-stamp"><UIcon name="i-lucide-heart" /></span>
            </div>
            <p class="waitlist-skeleton-label">
              {{ loadingLabel }}
            </p>
            <div class="waitlist-skeleton-lines">
              <span /><span />
            </div>
            <span class="waitlist-skeleton-field" />
            <div class="waitlist-skeleton-consent">
              <span /><span />
            </div>
            <span class="waitlist-skeleton-button" />
          </div>
          <Transition
            v-else
            name="waitlist"
            mode="out-in"
            @after-enter="resultHeading?.focus({ preventScroll: true })"
          >
            <div
              :key="state"
              class="waitlist-state"
            >
              <div
                class="waitlist-emblem"
                aria-hidden="true"
              >
                <span class="waitlist-letter"><UIcon
                  v-if="state === 'confirmed'"
                  name="i-lucide-mail-check"
                /><UIcon
                  v-else-if="state === 'pending'"
                  name="i-lucide-send"
                /><UIcon
                  v-else-if="state === 'withdrawn'"
                  name="i-lucide-heart-handshake"
                /><UIcon
                  v-else
                  name="i-lucide-mail-plus"
                /></span>
                <span class="waitlist-stamp"><UIcon name="i-lucide-heart" /></span>
              </div>
              <template v-if="state === 'form'">
                <h2>Vorfreude ins Postfach.</h2>
                <p>Trag deine E-Mail ein. Wir sagen dir Bescheid, sobald die KI-Funktionen für dich starten.</p>
                <form
                  class="waitlist-fields"
                  @submit.prevent="act('subscribe')"
                >
                  <label for="waitlist-email">Deine E-Mail-Adresse</label>
                  <input
                    id="waitlist-email"
                    v-model="email"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                    maxlength="254"
                    placeholder="du@beispiel.de"
                    required
                    :disabled="busy"
                  >
                  <label class="waitlist-consent"><input
                    v-model="consent"
                    type="checkbox"
                    required
                    :disabled="busy"
                  ><span>Ja, informiert mich per E-Mail zum Start der KI-Funktionen. Ich kann meine Einwilligung jederzeit widerrufen.</span></label>
                  <button
                    class="waitlist-primary"
                    type="submit"
                    :disabled="!consent"
                    :aria-disabled="busy || undefined"
                  >
                    <span>{{ loadingLabel || 'Zum Start Bescheid bekommen' }}</span><UIcon
                      v-if="busy"
                      name="i-lucide-loader-circle"
                      class="waitlist-spin"
                    /><UIcon
                      v-else
                      name="i-lucide-arrow-right"
                    />
                  </button>
                </form>
                <p class="waitlist-small">
                  Ohne Konto. Ohne Buchung. Ohne Kosten.
                </p>
              </template>
              <template v-else-if="state === 'pending'">
                <h2
                  ref="resultHeading"
                  tabindex="-1"
                >
                  Ein kleiner Klick fehlt noch.
                </h2>
                <p>
                  Schau in dein Postfach<template v-if="email">
                    für <strong class="waitlist-email">{{ email }}</strong>
                  </template>. Öffne die shliste-Mail und bestätige deine E-Mail-Adresse.
                </p>
                <ol class="waitlist-steps">
                  <li>Mail von shliste öffnen</li><li>„Ja, zum Start Bescheid bekommen“ anklicken</li><li>Auf der Seite bestätigen, fertig!</li>
                </ol>
                <p class="waitlist-small">
                  Nichts angekommen? Schau auch im Spamordner nach. Nach 15 Minuten kannst du einen neuen Link anfordern.
                </p>
                <button
                  v-if="email"
                  class="waitlist-primary"
                  :disabled="resendSeconds > 0"
                  :aria-disabled="busy || undefined"
                  @click="act('subscribe')"
                >
                  <span>{{ loadingLabel || (resendSeconds > 0 ? resendLabel : 'Bestätigungsmail erneut anfordern') }}</span>
                  <UIcon
                    v-if="busy"
                    name="i-lucide-loader-circle"
                    class="waitlist-spin"
                  />
                </button>
                <button
                  :class="email ? 'waitlist-secondary' : 'waitlist-primary'"
                  :disabled="busy"
                  @click="startAgain"
                >
                  {{ email ? 'E-Mail-Adresse korrigieren' : 'E-Mail-Adresse erneut eingeben' }}
                </button>
              </template>
              <template v-else-if="state === 'confirm'">
                <h2>Schön, dass du dabei bist.</h2><p>Ein letzter Klick bestätigt, dass wir dir zum Start der KI-Funktionen eine E-Mail schicken dürfen.</p>
                <button
                  class="waitlist-primary"
                  :aria-disabled="busy || undefined"
                  @click="act('confirm')"
                >
                  <span>{{ loadingLabel || 'Ja, meine Anmeldung bestätigen' }}</span>
                  <UIcon
                    v-if="busy"
                    name="i-lucide-loader-circle"
                    class="waitlist-spin"
                  />
                </button>
                <button
                  v-if="error"
                  class="waitlist-secondary"
                  :disabled="busy"
                  @click="startAgain"
                >
                  Neuen Bestätigungslink anfordern
                </button>
              </template>
              <template v-else-if="state === 'confirmed'">
                <RecipeBadgeConfetti
                  v-if="celebrating"
                  class="waitlist-confetti"
                />
                <h2
                  ref="resultHeading"
                  tabindex="-1"
                >
                  Du stehst auf unserer Liste. ❤️
                </h2><p>Deine E-Mail ist bestätigt. Wir melden uns zum Start. Bis dahin: Wie wäre es mit etwas Leckerem?</p>
                <NuxtLink
                  class="waitlist-primary"
                  to="/rezeptideen"
                >Rezeptideen entdecken<UIcon name="i-lucide-arrow-right" /></NuxtLink>
              </template>
              <template v-else-if="state === 'unsubscribe'">
                <h2>Lieber keine Nachricht?</h2><p>Hier kannst du deine Wartelisten-Anmeldung zurücknehmen. Deine Listen und Rezepte bleiben unverändert.</p><button
                  class="waitlist-primary"
                  :aria-disabled="busy || undefined"
                  @click="act('unsubscribe')"
                >
                  <span>{{ loadingLabel || 'Anmeldung zurücknehmen' }}</span>
                  <UIcon
                    v-if="busy"
                    name="i-lucide-loader-circle"
                    class="waitlist-spin"
                  />
                </button>
              </template>
              <template v-else>
                <h2
                  ref="resultHeading"
                  tabindex="-1"
                >
                  Alles klar. Du bist abgemeldet.
                </h2><p>Du bekommst von dieser Warteliste keine Nachricht mehr. Schön, wenn wir uns trotzdem wiedersehen.</p><NuxtLink
                  class="waitlist-primary"
                  to="/app/lists"
                  data-analytics-event="open_app"
                  data-analytics-location="waitlist"
                >Zu deinen Listen<UIcon name="i-lucide-arrow-right" /></NuxtLink>
              </template>
            </div>
          </Transition>
          <p
            v-if="error"
            role="alert"
            class="waitlist-error"
          >
            {{ error }}
          </p>
          <p class="waitlist-privacy">
            Kein Newsletter. Wir speichern deine Einwilligung und melden Anmeldung und Bestätigung intern an unser Team. <NuxtLink to="/privacy#ki-warteliste">Datenschutz</NuxtLink>
          </p>
        </section>
        <MarketingMoodImage
          class="waitlist-mood"
          name="waitlist-anticipation"
          alt="Zwei Menschen sitzen auf einer Fensterbank in der Küche und schauen lächelnd auf ein Handy. Vor ihnen stehen zwei Tassen, Marmeladenplätzchen und ein Brief mit Herzsiegel."
          caption="Etwas Gutes ist unterwegs."
          icon="i-lucide-mail-open"
          wide
        />
        <MarketingFeatureWall />
      </main>
    </div>
  </MarketingChrome>
</template>

<style scoped>
.waitlist-page{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(2rem,5vw,5rem);align-items:start;padding-block:clamp(2.5rem,6vw,6rem)}.waitlist-story{padding-top:.5rem}.waitlist-story h1{font-size:clamp(2.2rem,3.8vw,3.8rem);line-height:1.12;letter-spacing:-.035em;margin:1.5rem 0}.waitlist-intro{font-size:1.125rem;line-height:1.65;margin:0}.waitlist-promises{display:grid;gap:.875rem;margin:1.75rem 0}.waitlist-promises span{display:flex;align-items:center;gap:.75rem;font-weight:600}.waitlist-promises .iconify{width:1.25rem;height:1.25rem;color:#a63780}.waitlist-note{font-size:.9375rem;line-height:1.6;color:var(--md-on-surface-variant)}.waitlist-card{min-width:0;padding:clamp(1.25rem,3vw,2rem);border:1px solid #e8d5e1;border-radius:1.75rem;background:var(--md-surface,#fff);box-shadow:0 12px 40px #38243208}.waitlist-state{display:grid;gap:.875rem}.waitlist-emblem{display:grid;place-items:center;width:3.5rem;height:3.5rem;border-radius:1.125rem;background:#f8e5f0;color:#a63780;margin-bottom:.375rem}.waitlist-emblem .iconify{width:1.75rem;height:1.75rem}.waitlist-state h2{margin:0;font-size:1.6rem;line-height:1.25;letter-spacing:-.02em}.waitlist-state p{margin:0;line-height:1.55}.waitlist-fields{display:grid;gap:.5rem;margin-top:.5rem}.waitlist-fields > label:first-child{font-size:.875rem;font-weight:650}.waitlist-fields input[type=email]{width:100%;min-height:3.25rem;border:1px solid var(--md-outline-variant);border-radius:.875rem;padding:.875rem 1rem;background:var(--md-surface-low);color:var(--md-on-surface);font:inherit}.waitlist-consent{display:flex;align-items:start;gap:.75rem;margin:.75rem 0;font-size:.875rem;line-height:1.5}.waitlist-consent input{flex:none;accent-color:#a63780;width:1.125rem;height:1.125rem;margin:.125rem 0 0}.waitlist-primary{display:flex;align-items:center;justify-content:center;gap:.625rem;min-height:3.125rem;padding:.875rem 1rem;border:0;border-radius:999px;background:#a63780;color:white;font:inherit;font-weight:650;line-height:1.4;text-align:center;text-decoration:none;cursor:pointer}.waitlist-primary .iconify{flex:none;width:1.125rem;height:1.125rem}.waitlist-primary:disabled{opacity:.55;cursor:default}.waitlist-secondary{border:0;background:none;color:#a63780;padding:.5rem;font:inherit;font-size:.875rem;cursor:pointer}.waitlist-small,.waitlist-privacy{font-size:.8125rem;color:var(--md-on-surface-variant);line-height:1.55}.waitlist-privacy{margin:1.5rem 0 0;padding-top:1.25rem;border-top:1px solid var(--md-outline-variant)}.waitlist-privacy a{text-decoration:underline}.waitlist-email{overflow-wrap:anywhere}.waitlist-steps{margin:.5rem 0;padding-left:1.25rem;line-height:1.9}.waitlist-error{padding:.875rem;border-radius:.75rem;background:#fff0ef;color:#8a2538;line-height:1.5}.waitlist-enter-active,.waitlist-leave-active{transition:opacity .16s,transform .16s}.waitlist-enter-from,.waitlist-leave-to{opacity:0;transform:translateY(4px)}.waitlist-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}:is(button,input,a):focus-visible{outline:3px solid #a63780;outline-offset:3px}@media(max-width:800px){.waitlist-page{grid-template-columns:minmax(0,1fr);gap:1.5rem}.waitlist-story h1{font-size:2.4rem}.waitlist-promises{display:none}}@media(prefers-reduced-motion:reduce){.waitlist-enter-active,.waitlist-leave-active{transition:none}.waitlist-spin{animation:none}}

.waitlist-scenery {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(ellipse 68% 30rem at 91% 12%, #e9c6e33b, transparent 92%),
    radial-gradient(ellipse 76% 39rem at 0% 59%, #ded0f244, transparent 91%),
    radial-gradient(ellipse 72% 30rem at 100% 92%, #f2c8e134, transparent 95%),
    var(--md-background);
}
.waitlist-page { position: relative; z-index: 1; }
.waitlist-skeleton {
  display: grid;
  align-content: start;
  gap: .875rem;
  min-block-size: 25rem;
}
.waitlist-skeleton-label {
  font-size: clamp(1.4rem,2vw,1.8rem);
  font-weight: 800;
  line-height: 1.2;
}
.waitlist-skeleton-lines, .waitlist-skeleton-consent { display: grid; gap: .5rem; }
.waitlist-skeleton-lines span, .waitlist-skeleton-consent span,
.waitlist-skeleton-field, .waitlist-skeleton-button {
  display: block;
  border-radius: .875rem;
  background: color-mix(in srgb, var(--waitlist-accent) 9%, var(--md-surface));
}
.waitlist-skeleton-lines span, .waitlist-skeleton-consent span { block-size: .65rem; }
.waitlist-skeleton-lines span:first-child { inline-size: 92%; }
.waitlist-skeleton-lines span:last-child { inline-size: 64%; }
.waitlist-skeleton-field { block-size: 3.25rem; margin-block-start: 1.5rem; }
.waitlist-skeleton-consent { grid-template-columns: 1.125rem minmax(0,1fr); align-items: center; margin-block: .75rem; }
.waitlist-skeleton-consent span:first-child { block-size: 1.125rem; border-radius: .25rem; }
.waitlist-skeleton-consent span:last-child { inline-size: 82%; }
.waitlist-skeleton-button { block-size: 3.125rem; border-radius: 999px; }
.waitlist-primary[aria-disabled='true'] { cursor: wait; }
@media (prefers-reduced-motion: no-preference) {
  .waitlist-skeleton-lines span, .waitlist-skeleton-consent span,
  .waitlist-skeleton-field, .waitlist-skeleton-button {
    background-image: linear-gradient(110deg, transparent 36%, #fff9fcaa 50%, transparent 64%);
    background-size: 240% 100%;
    animation: waitlist-skeleton-glow 1.7s ease-in-out infinite;
  }
  @keyframes waitlist-skeleton-glow { from { background-position: 125% 0; } to { background-position: -25% 0; } }
}
.waitlist-confetti { inset: -1rem -.75rem; }
.waitlist-confetti :deep(span:nth-child(4n + 1)) { background: #bb4288; }
.waitlist-confetti :deep(span:nth-child(4n + 2)) { background: #9268c8; }
.waitlist-confetti :deep(span:nth-child(4n + 3)) { background: #e5ac73; }
.waitlist-confetti :deep(span:nth-child(4n)) { background: #68a59d; }
/* The same editorial scale, palette and page boundaries as the marketing chapters. */
.waitlist-page{--waitlist-accent:var(--demo-accent,#a63780);column-gap:clamp(2rem,6vw,5.5rem);grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:center;padding-block:3rem 4.5rem}
.waitlist-story{padding:0;min-width:0}
.waitlist-mood{position:relative;z-index:1;grid-column:1/-1;margin-top:clamp(2rem,4vw,3.5rem)}.waitlist-back{display:inline-flex;align-items:center;min-height:1.75rem;gap:.5rem;color:var(--md-on-surface-variant);font-size:.8125rem;text-decoration:none;margin-bottom:2rem}
.waitlist-back .iconify{width:1rem;height:1rem}
.waitlist-back:hover{color:var(--waitlist-accent)}
.waitlist-eyebrow{margin:0 0 .75rem}
.waitlist-story h1{font-size:clamp(2.6rem,4.8vw,4.25rem);font-weight:900;line-height:1.06;letter-spacing:-.045em;margin:1.4rem 0 1.15rem;text-wrap:balance}
.waitlist-story h1 span{color:var(--waitlist-accent)}
.waitlist-intro{max-width:31rem;font-size:1.125rem;line-height:1.6;color:var(--md-on-surface-variant)}
.waitlist-promises{display:grid;gap:1.125rem;margin:1.75rem 0}
.waitlist-feature{display:grid;grid-template-columns:2.25rem minmax(0,1fr);gap:.75rem;align-items:start}
.waitlist-feature-icon{display:grid!important;place-items:center;width:2.25rem;height:2.25rem;border-radius:.8rem;background:color-mix(in srgb,var(--waitlist-accent) 9%,transparent);color:var(--waitlist-accent)}
.waitlist-feature strong{display:block;font-size:.9375rem;line-height:1.5}
.waitlist-feature p{font-size:.875rem;line-height:1.5;margin:.125rem 0 0;color:var(--md-on-surface-variant)}
.waitlist-note{max-width:31rem;font-size:.875rem;margin:0;line-height:1.6}
.waitlist-card{scroll-margin-top:7rem;position:relative;border-radius:2rem;background:var(--md-surface,#fff);padding:clamp(1.5rem,3.2vw,2.5rem);border-color:color-mix(in srgb,var(--waitlist-accent) 18%,var(--md-surface,#fff));box-shadow:0 20px 60px -30px #6e315c38,inset 0 1px 0 #ffffffb0}
.waitlist-card::before{content:'';position:absolute;top:-1px;left:2.5rem;width:4rem;height:3px;background:var(--waitlist-accent);border-radius:999px}
.waitlist-emblem{position:relative;width:5rem;height:4.5rem;background:none;margin:0 0 .5rem;isolation:isolate}
.waitlist-letter{display:grid;place-items:center;width:4.25rem;height:3.5rem;border:1px solid #e9c7df;border-radius:1rem;background:linear-gradient(145deg,#fff9fc,#f5dfee);color:#a63780;box-shadow:0 8px 16px -10px #a6378060;transform:rotate(-7deg);animation:waitlist-letter-in .48s cubic-bezier(.2,.8,.2,1) both}
.waitlist-letter .iconify{display:block;width:2rem;height:2rem}
.waitlist-stamp{position:absolute;right:0;bottom:.15rem;display:grid;place-items:center;width:1.875rem;height:1.875rem;border-radius:50%;background:#382432;color:#f4cee8;border:3px solid var(--md-surface,#fff)}
.waitlist-stamp .iconify{width:.875rem;height:.875rem}
.waitlist-state{gap:.75rem}
.waitlist-state h2{font-size:clamp(1.4rem,2vw,1.8rem);font-weight:800;line-height:1.2;text-wrap:balance}
.waitlist-state>p:not(.waitlist-small){font-size:.9375rem;color:var(--md-on-surface-variant);line-height:1.55}
.waitlist-fields{margin-top:.75rem}
.waitlist-fields input[type=email]{background:var(--md-surface-low,#fff8fc);border-color:color-mix(in srgb,var(--waitlist-accent) 22%,transparent);transition:border-color .18s,box-shadow .18s}
.waitlist-fields input[type=email]:focus{border-color:var(--waitlist-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--waitlist-accent) 9%,transparent)}
.waitlist-consent{font-size:.8125rem;margin:.875rem 0;line-height:1.5}
.waitlist-primary{background:var(--waitlist-accent);font-size:.9375rem;transition:background .18s,box-shadow .18s}
.waitlist-primary:not(:disabled):hover{background:color-mix(in srgb,var(--waitlist-accent) 88%,#382432);box-shadow:0 6px 18px -8px #a6378070}
.waitlist-primary .iconify{transition:transform .18s}
.waitlist-primary:not(:disabled):hover .iconify:not(.waitlist-spin){transform:translateX(3px)}
.waitlist-small{text-align:center;font-size:.75rem}
.waitlist-privacy{font-size:.75rem;margin-top:1.25rem;padding-top:1rem;line-height:1.5}
@keyframes waitlist-letter-in{from{opacity:0;transform:translateY(6px) rotate(-12deg)}to{opacity:1;transform:translateY(0) rotate(-7deg)}}
@media(max-width:800px){.waitlist-page{grid-template-columns:minmax(0,1fr);padding-block:1.5rem 3rem;gap:2rem}.waitlist-back{margin-bottom:1.25rem}.waitlist-story h1{font-size:clamp(2.5rem,8vw,3.5rem)}.waitlist-promises{gap:.875rem;margin:1.25rem 0}.waitlist-note{display:none}.waitlist-card{width:100%;max-width:36rem;justify-self:center}.waitlist-feature p{font-size:.8125rem}}
@media(prefers-reduced-motion:reduce){.waitlist-letter{animation:none}.waitlist-primary,.waitlist-primary .iconify,.waitlist-fields input[type=email]{transition:none}.waitlist-primary:not(:disabled):hover .iconify{transform:none}}
</style>
