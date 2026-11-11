<script setup lang="ts">
/**
 * Profilseite — Aufbau wie Androids UserScreen, als eine Seite mit
 * Abschnitten statt getrennter Screens: Konto, dann Badges, dann
 * Einladungen, zuletzt die Synchronisation. Die Reihenfolge ist dieselbe
 * Wertaussage wie dort: Oben steht, was jemandem gehört und was auf eine
 * Antwort wartet; der Abgleich steht zuletzt und zurückgenommen.
 */
import { parseEditorialMetadata } from '~~/lib/editorial'
import { getListsForView, getRecipesForView } from '../../db/repositories'
import { describeSyncError, toSyncError } from '../../sync/engine/errors'
import { requestJson, SYNC_ENDPOINTS } from '../../sync/engine/transport'
import { formatRelativeTime } from '../../utils/relativeTime'

definePageMeta({ layout: 'app' })

const { profile, isSignedIn, signOut, updateDisplayName } = useAuth()
const { snapshot, display, dataVersion, realtime, requestSync } = useSync()
const { badges, reload: reloadBadges } = useBadges()

/* ------------------------------------------------------------------ *
 * Lokale und serverseitige Zählstände
 * ------------------------------------------------------------------ */

const localCounts = ref<{ lists: number, recipes: number } | null>(null)

/** Aktuelle Bildpfade der Rezepte — ein Badge zeigt bevorzugt das heutige Bild. */
const recipeImageById = ref<ReadonlyMap<string, string | null>>(new Map())

async function reloadLocal(): Promise<void> {
  if (import.meta.server) return

  const [lists, recipes] = await Promise.all([getListsForView(), getRecipesForView()])
  localCounts.value = { lists: lists.length, recipes: recipes.length }
  recipeImageById.value = new Map(recipes.map(row => [row.id, resolveRecipeImageUrl(row.imagePath) ?? parseEditorialMetadata(row.editorialMetadata)?.hero.src ?? null]))
  await reloadBadges()
}

interface ServerStatus {
  lists: number
  recipes: number
  badges: number
  images: number
}

/** `null` heißt: noch nicht geladen oder nicht erreichbar. */
const serverStatus = ref<ServerStatus | null>(null)
const serverReachable = ref<boolean | null>(null)

function parseServerStatus(value: unknown): ServerStatus | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const numbers = [record.lists, record.recipes, record.badges, record.images]
  if (!numbers.every(entry => typeof entry === 'number')) return null
  return {
    lists: record.lists as number,
    recipes: record.recipes as number,
    badges: record.badges as number,
    images: record.images as number,
  }
}

async function loadServerStatus(): Promise<void> {
  if (import.meta.server || !isSignedIn.value) return
  try {
    serverStatus.value = parseServerStatus(await requestJson(SYNC_ENDPOINTS.status))
    serverReachable.value = serverStatus.value !== null
  }
  catch {
    serverReachable.value = false
  }
}

onMounted(() => {
  void reloadLocal()
})

/**
 * Der Serverstand hängt an der Anmeldung — und die trifft beim Start erst NACH
 * dem Mounten ein: `plugins/session.client.ts` holt die Sitzung ohne `await`,
 * `isSignedIn` ist also im `onMounted` verlässlich noch `false`. Von dort
 * aufgerufen brach `loadServerStatus()` deshalb bei jedem direkten Aufruf
 * dieser Seite ab (Neuladen, Lesezeichen, Kaltstart der PWA) und setzte nie
 * wieder an: Die Server-Spalte blieb dauerhaft „–", die Verbindung ewig auf
 * „Prüfe…", obwohl der Server erreichbar war.
 *
 * Als Beobachter statt als einmalige Frage, mit `immediate` für den Fall, dass
 * die Sitzung beim Betreten der Seite längst steht. Dieselbe Verdrahtung wie
 * beim Abgleich selbst (`watch(isSignedIn, …)` in `useSync.ts`).
 */
watch(isSignedIn, (signedIn) => {
  if (signedIn) void loadServerStatus()
}, { immediate: true })

watch(dataVersion, () => {
  void reloadLocal()
})

/* ------------------------------------------------------------------ *
 * Eigener Name
 * ------------------------------------------------------------------ */

/** Wie die API: Mehr Zeichen würde sie ohnehin abschneiden. */
const DISPLAY_NAME_MAX_LENGTH = 40

const nameDraft = ref('')
const isSavingName = ref(false)
const nameError = ref<string | null>(null)

// Vorbelegt mit dem gezeigten Namen. Ob das ein eigener oder der von Google
// ist, sagt die Anmeldung nicht. Deshalb bleibt Speichern ohne Änderung
// gesperrt, sonst würde der Google-Name ungewollt zum eigenen.
watch(() => profile.value?.displayName, (name) => {
  nameDraft.value = name ?? ''
}, { immediate: true })

const isNameUnchanged = computed(() => nameDraft.value.trim() === (profile.value?.displayName ?? ''))

function describeNameError(cause: unknown): string {
  const error = toSyncError(cause)
  switch (error.kind) {
    case 'auth': return describeSyncError(error)
    case 'offline': return 'Keine Verbindung. Dein Name wurde nicht gespeichert.'
    case 'rateLimited': return 'Zu viele Anfragen. Versuch es gleich noch einmal.'
    default: return 'Dein Name konnte nicht gespeichert werden. Versuch es später noch einmal.'
  }
}

async function saveName(): Promise<void> {
  if (isNameUnchanged.value || isSavingName.value) return
  isSavingName.value = true
  nameError.value = null
  try {
    await updateDisplayName(nameDraft.value)
    // Auch wenn der gekürzte Name dem alten gleicht und der Beobachter schweigt
    nameDraft.value = profile.value?.displayName ?? ''
  }
  catch (cause) {
    nameError.value = describeNameError(cause)
  }
  finally {
    isSavingName.value = false
  }
}

/* ------------------------------------------------------------------ *
 * Darstellung
 * ------------------------------------------------------------------ */

/** Erster Buchstabe für Badge-Kacheln ohne Bild und für den Avatar. */
function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function badgeImageUrl(recipeId: string, badgeImagePath: string | null): string | null {
  const current = recipeImageById.value.get(recipeId)
  return current ?? resolveRecipeImageUrl(badgeImagePath)
}

const selectedBadgeId = ref<string | null>(null)
const badgeDetailOpen = ref(false)
const selectedBadge = computed(() => badges.value.find(badge => badge.id === selectedBadgeId.value) ?? null)

function showBadge(id: string) {
  selectedBadgeId.value = id
  badgeDetailOpen.value = true
}

// Die relative Zeit ("gerade eben, vor N Min., …") kommt aus
// `utils/relativeTime.ts` — geteilt mit dem Verlauf (HistorySheet).

const syncHeadline = computed(() => {
  switch (display.value) {
    case 'synced': return { icon: 'i-lucide-check', color: 'var(--md-sync-success)', label: 'Synchronisiert' }
    case 'syncing': return { icon: 'i-lucide-loader-circle', color: 'var(--md-primary)', label: 'Synchronisiert…' }
    case 'pending': return { icon: 'i-lucide-cloud-upload', color: 'var(--md-sync-warning)', label: 'Änderungen warten' }
    case 'error': return { icon: 'i-lucide-triangle-alert', color: 'var(--md-delete-content)', label: snapshot.value.message ?? 'Fehler' }
    default: return { icon: 'i-lucide-cloud-off', color: 'var(--md-on-surface-variant)', label: 'Offline' }
  }
})

const realtimeRow = computed(() => {
  if (!isSignedIn.value) return { ok: false, label: 'Deaktiviert' }
  if (realtime.value.isDegraded) return { ok: false, label: 'Ersatz-Abfrage läuft' }
  switch (realtime.value.status) {
    case 'open': return { ok: true, label: 'Aktiv' }
    case 'connecting':
    case 'reconnecting': return { ok: false, label: 'Verbindet…' }
    default: return { ok: false, label: 'Inaktiv' }
  }
})

const serverRow = computed(() => {
  if (!isSignedIn.value) return { ok: false, label: 'Deaktiviert' }
  if (serverReachable.value === null) return { ok: false, label: 'Prüfe…' }
  return serverReachable.value ? { ok: true, label: 'Erreichbar' } : { ok: false, label: 'Nicht erreichbar' }
})

const isSyncing = computed(() => display.value === 'syncing')

async function syncNow(): Promise<void> {
  // Ausdrücklich vom Nutzer: Läuft in einem anderen Tab gerade ein Abgleich,
  // stellt sich dieser Lauf an, statt still nichts zu tun.
  await requestSync({ userInitiated: true })
  await loadServerStatus()
}

/**
 * Googles "merk dir dieses Konto" zurücknehmen, ohne die Bibliothek zu laden:
 * War sie in dieser Sitzung nie im Einsatz, gibt es auch nichts zu vergessen.
 * Lag vorher im Avatar-Menü des AuthButton; seit der Profil-Knopf im Layout
 * das Menü ersetzt, ist diese Seite der einzige Abmeldeweg.
 */
function disableGoogleAutoSelect(): void {
  const google: unknown = Reflect.get(globalThis, 'google')
  if (typeof google !== 'object' || google === null || !('accounts' in google)) return
  const accounts = google.accounts
  if (typeof accounts !== 'object' || accounts === null || !('id' in accounts)) return
  const id = accounts.id
  if (typeof id !== 'object' || id === null || !('disableAutoSelect' in id)) return
  const disable = id.disableAutoSelect
  if (typeof disable === 'function') disable.call(id)
}

async function handleSignOut(): Promise<void> {
  await signOut()

  // Ohne diesen Aufruf meldet Google beim nächsten Öffnen sofort dasselbe
  // Konto wieder an — die Abmeldung wäre für den Nutzer wirkungslos.
  disableGoogleAutoSelect()

  await navigateTo('/')
}
</script>

<template>
  <div>
    <!-- Kein eigener Scroll-Container: Für Seiten ohne eigenen scrollt das <main> des Layouts. -->
    <div class="mx-auto w-full max-w-3xl pb-10">
      <AppPageHeader title="Mein Profil" />

      <!-- Konto -->
      <section class="px-5 pb-2">
        <div
          class="flex flex-wrap items-center gap-4 rounded-xl p-4 shadow-sm"
          style="background-color: var(--md-surface); border: 1px solid var(--md-outline-variant)"
        >
          <img
            v-if="profile?.photoUrl"
            :src="profile.photoUrl"
            alt=""
            class="size-14 shrink-0 rounded-full object-cover"
            referrerpolicy="no-referrer"
          >
          <div
            v-else
            class="flex size-14 shrink-0 items-center justify-center rounded-full text-[1.375rem] font-bold"
            style="background-color: var(--md-primary-container); color: var(--md-on-primary-container)"
          >
            {{ profile ? initialOf(profile.displayName ?? profile.email) : '?' }}
          </div>
          <div class="min-w-0 flex-1 basis-44">
            <p class="text-[1.25rem] leading-snug font-bold [overflow-wrap:anywhere]">
              {{ profile?.displayName ?? (isSignedIn ? profile?.email : 'Nicht angemeldet') }}
            </p>
            <p
              class="text-[1rem] [overflow-wrap:anywhere]"
              style="color: var(--md-on-surface-variant)"
            >
              {{ isSignedIn ? profile?.email : 'Du nutzt shliste auf diesem Gerät' }}
            </p>
          </div>
          <div class="ms-auto shrink-0">
            <UButton
              v-if="isSignedIn"
              variant="outline"
              color="neutral"
              @click="handleSignOut"
            >
              Abmelden
            </UButton>
            <AuthButton v-else />
          </div>
        </div>

        <!-- Eigener Name -->
        <form
          v-if="isSignedIn"
          class="mt-3 rounded-xl p-4 shadow-sm"
          style="background-color: var(--md-surface); border: 1px solid var(--md-outline-variant)"
          @submit.prevent="saveName"
        >
          <label
            for="display-name"
            class="text-[1rem] font-bold"
          >
            Dein Name
          </label>
          <p
            class="pt-1 text-[1rem]"
            style="color: var(--md-on-surface-variant)"
          >
            So sehen dich andere an deinen Einträgen in geteilten Listen. Lässt du das Feld leer, gilt wieder dein Name aus dem Google-Konto.
          </p>
          <p
            v-if="nameError"
            class="mt-3 rounded-lg px-3 py-2 text-[1rem]"
            style="background: var(--md-delete-surface); color: var(--md-delete-content)"
            role="alert"
          >
            {{ nameError }}
          </p>
          <div class="flex items-center gap-2 pt-3">
            <UInput
              id="display-name"
              v-model="nameDraft"
              :maxlength="DISPLAY_NAME_MAX_LENGTH"
              placeholder="Name aus dem Google-Konto"
              size="lg"
              autocomplete="nickname"
              class="grow"
              :ui="{ root: 'w-full' }"
            />
            <UButton
              type="submit"
              :loading="isSavingName"
              :disabled="isNameUnchanged"
              size="lg"
              class="shrink-0 rounded-xl font-bold"
            >
              Speichern
            </UButton>
          </div>
        </form>
      </section>

      <!-- Badges -->
      <section class="px-5 pt-6">
        <h2 class="flex items-center gap-2 text-[1.375rem] font-bold">
          <UIcon
            name="i-lucide-award"
            class="size-5"
            style="color: #DAA520"
          />
          Meine Badges
          <span
            v-if="badges.length > 0"
            class="text-[1rem] font-normal"
            style="color: var(--md-on-surface-variant)"
          >({{ badges.length }})</span>
        </h2>

        <p
          v-if="badges.length === 0"
          class="pt-3 text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Noch keine Badges. Koch ein Rezept zu Ende!
        </p>

        <ul
          v-else
          class="collection-badges"
        >
          <li
            v-for="badge in badges"
            :key="badge.id"
          >
            <button
              type="button"
              class="collection-badge"
              aria-haspopup="dialog"
              @click="showBadge(badge.id)"
            >
              <span class="collection-badge__picture">
                <img
                  v-if="badgeImageUrl(badge.recipeId, badge.recipeImagePath)"
                  :src="badgeImageUrl(badge.recipeId, badge.recipeImagePath) ?? undefined"
                  alt=""
                  loading="lazy"
                >
                <span
                  v-else
                  class="collection-badge__monogram"
                  aria-hidden="true"
                  :style="{ '--recipe-ink': badge.recipeColor }"
                >
                  {{ initialOf(badge.recipeName) }}
                </span>
              </span>
              <span class="collection-badge__inscription">
                <RecipeBadgeSeal />
                <span class="collection-badge__name">{{ badge.recipeName }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <BadgeEarnedSheet
        v-if="selectedBadge"
        v-model:open="badgeDetailOpen"
        replay
        :badge="selectedBadge"
        :image-url="badgeImageUrl(selectedBadge.recipeId, selectedBadge.recipeImagePath)"
      />

      <!-- Einladungen -->
      <section
        v-if="isSignedIn"
        class="px-5 pt-8"
      >
        <h2 class="flex items-center gap-2 text-[1.375rem] font-bold">
          <UIcon
            name="i-lucide-users"
            class="size-5"
            style="color: var(--md-primary)"
          />
          Einladungen
        </h2>
        <div class="pt-3">
          <PendingInvites
            v-if="snapshot.pendingInvites.length > 0"
            :invites="snapshot.pendingInvites"
            @answered="requestSync"
          />
          <p
            v-else
            class="text-[1rem]"
            style="color: var(--md-on-surface-variant)"
          >
            Keine offenen Einladungen. Sobald dich jemand zu einer Liste einlädt, findest du sie hier.
          </p>
        </div>
      </section>
      <section
        v-else
        class="px-5 pt-8"
        aria-labelledby="local-storage-title"
      >
        <h2
          id="local-storage-title"
          class="text-[1.375rem] font-bold"
        >
          Auf diesem Gerät gespeichert
        </h2>
        <p
          class="mt-3 text-[1rem]"
          style="color: var(--md-on-surface-variant)"
        >
          Deine Listen und Rezepte bleiben in diesem Browser. Mit einer Anmeldung kannst du sie zwischen deinen Geräten abgleichen und Listen teilen.
        </p>
        <p class="mt-3 text-[1rem] tabular-nums">
          {{ localCounts?.lists ?? '–' }} {{ localCounts?.lists === 1 ? 'Liste' : 'Listen' }} · {{ localCounts?.recipes ?? '–' }} {{ localCounts?.recipes === 1 ? 'Rezept' : 'Rezepte' }}
        </p>
      </section>

      <!-- Synchronisation -->
      <section
        v-if="isSignedIn"
        class="px-5 pt-8"
      >
        <h2 class="flex items-center gap-2 text-[1.375rem] font-bold">
          <UIcon
            name="i-lucide-refresh-cw"
            class="size-5"
            style="color: var(--md-primary)"
          />
          Synchronisation
        </h2>

        <div
          class="mt-3 rounded-xl p-4 shadow-sm"
          style="background-color: var(--md-surface); border: 1px solid var(--md-outline-variant)"
        >
          <!-- Statuskopf, zentriert wie in Android -->
          <div class="flex flex-col items-center gap-2 pb-4 text-center">
            <div
              class="flex size-16 items-center justify-center rounded-full"
              :style="{ backgroundColor: `color-mix(in srgb, ${syncHeadline.color} 12%, transparent)` }"
            >
              <UIcon
                :name="syncHeadline.icon"
                class="size-7"
                :class="isSyncing && 'animate-spin motion-reduce:animate-none'"
                :style="{ color: syncHeadline.color }"
              />
            </div>
            <p class="font-bold">
              {{ syncHeadline.label }}
            </p>
            <p
              class="text-[1rem]"
              style="color: var(--md-on-surface-variant)"
            >
              Letzter Sync: {{ formatRelativeTime(snapshot.lastSyncedAt) }}
            </p>
            <p
              v-if="snapshot.notSyncedCount > 0"
              class="text-[1rem]"
              style="color: var(--md-sync-warning)"
            >
              {{ snapshot.notSyncedCount }} Einträge konnten nicht übernommen werden. Sie bleiben auf diesem Gerät erhalten und werden erneut versucht.
            </p>
          </div>

          <!-- Daten: lokal / Server -->
          <h3
            class="pb-1 text-[1rem] font-bold tracking-wide uppercase"
            style="color: var(--md-on-surface-variant)"
          >
            Daten
          </h3>
          <dl
            class="divide-y"
            style="border-color: var(--md-outline-variant)"
          >
            <div class="flex items-center justify-between py-1.5 text-[1rem]">
              <dt>Listen</dt>
              <dd class="tabular-nums">
                {{ localCounts?.lists ?? '–' }} / {{ serverStatus?.lists ?? '–' }}
              </dd>
            </div>
            <div class="flex items-center justify-between py-1.5 text-[1rem]">
              <dt>Rezepte</dt>
              <dd class="tabular-nums">
                {{ localCounts?.recipes ?? '–' }} / {{ serverStatus?.recipes ?? '–' }}
              </dd>
            </div>
            <div class="flex items-center justify-between py-1.5 text-[1rem]">
              <dt>Badges</dt>
              <dd class="tabular-nums">
                {{ badges.length }} / {{ serverStatus?.badges ?? '–' }}
              </dd>
            </div>
            <div
              v-if="snapshot.pendingCount > 0"
              class="flex items-center justify-between py-1.5 text-[1rem]"
            >
              <dt>Wartet auf Übertragung</dt>
              <dd
                class="tabular-nums"
                style="color: var(--md-sync-warning)"
              >
                {{ snapshot.pendingCount }}
              </dd>
            </div>
          </dl>

          <!-- Verbindung -->
          <h3
            class="pt-4 pb-1 text-[1rem] font-bold tracking-wide uppercase"
            style="color: var(--md-on-surface-variant)"
          >
            Verbindung
          </h3>
          <dl
            class="divide-y"
            style="border-color: var(--md-outline-variant)"
          >
            <div class="flex items-center justify-between py-1.5 text-[1rem]">
              <dt class="flex items-center gap-2">
                <span
                  class="size-2 rounded-full"
                  :style="{ backgroundColor: realtimeRow.ok ? 'var(--md-sync-success)' : 'var(--md-sync-warning)' }"
                />
                Echtzeit-Updates
              </dt>
              <dd style="color: var(--md-on-surface-variant)">
                {{ realtimeRow.label }}
              </dd>
            </div>
            <div class="flex items-center justify-between py-1.5 text-[1rem]">
              <dt class="flex items-center gap-2">
                <span
                  class="size-2 rounded-full"
                  :style="{ backgroundColor: serverRow.ok ? 'var(--md-sync-success)' : 'var(--md-sync-warning)' }"
                />
                Server
              </dt>
              <dd style="color: var(--md-on-surface-variant)">
                {{ serverRow.label }}
              </dd>
            </div>
          </dl>

          <div class="pt-4">
            <UButton
              block
              :disabled="!isSignedIn || isSyncing"
              :loading="isSyncing"
              @click="syncNow"
            >
              Jetzt synchronisieren
            </UButton>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.collection-badges {
  display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); grid-auto-rows: 1fr;
  gap: clamp(.65rem, 1.6vw, 1.15rem); padding-top: 1rem; container-type: inline-size;
}
.collection-badges > li { display: flex; min-width: 0; }
.collection-badge {
  position: relative; isolation: isolate; display: flex; flex-direction: column; width: 100%; min-width: 0;
  cursor: pointer; text-align: center; padding: .38rem; overflow: hidden;
  border: 1px solid #ac815f; border-radius: .95rem .95rem 1.35rem 1.35rem;
  background: radial-gradient(ellipse at 6% 5%, #865063, transparent 64%), linear-gradient(140deg,#522e42,#271a2b);
  color: #fff0da; box-shadow: inset 0 0 0 2px #45283b, inset 0 0 0 3px #ad835e, 0 4px 10px #401f361b;
}
.collection-badge__picture { display: grid; place-items: center; width: 100%; aspect-ratio: 2; overflow: hidden; background: #301f2a; border-radius: .62rem .62rem .16rem .16rem; }
.collection-badge__picture img { width: 100%; height: 100%; min-height: 0; object-fit: contain; }
.collection-badge__monogram { color: #ffdfb2; font: italic 2rem Georgia,serif; }
.collection-badge__inscription { position: relative; flex: 1; display: grid; place-items: center; width: 100%; padding: 1.82rem .68rem 1.2rem; }
.collection-badge__inscription::before, .collection-badge__inscription::after {
  content: ''; position: absolute; pointer-events: none; left: 12%; right: 12%;
  background: linear-gradient(90deg, transparent, #deb684 24%, #deb684 76%, transparent);
}
.collection-badge__inscription::before { height: 1px; top: 0; }
.collection-badge__inscription::after { height: 3px; bottom: .42rem; clip-path: polygon(0 50%,45% 35%,50% 0,55% 35%,100% 50%,55% 65%,50% 100%,45% 65%); }
.collection-badge__inscription > .recipe-badge-seal { position: absolute; left: 50%; top: 0; translate: -50% -50%; z-index: 1; }
.collection-badge__name { font: 600 clamp(1.09rem,3.15cqw,1.5rem)/1.12 Georgia,serif; letter-spacing: -.025em; overflow-wrap: anywhere; }
.collection-badge:focus-visible { outline: 3px solid var(--md-primary); outline-offset: 3px; }
@media (hover: hover) { .collection-badge:hover { border-color: #e2bb88; box-shadow: inset 0 0 0 2px #45283b, inset 0 0 0 3px #e1bc8a, 0 6px 15px #401f3630; } }
@media(max-width: 620px) { .collection-badges { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width: 340px) { .collection-badges { grid-template-columns: 1fr; } }
</style>
