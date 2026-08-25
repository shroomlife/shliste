<script setup lang="ts">
/**
 * Profilseite — Aufbau wie Androids UserScreen, als eine Seite mit
 * Abschnitten statt getrennter Screens: Konto, dann Badges, dann
 * Einladungen, zuletzt die Synchronisation. Die Reihenfolge ist dieselbe
 * Wertaussage wie dort: Oben steht, was jemandem gehört und was auf eine
 * Antwort wartet; der Abgleich steht zuletzt und zurückgenommen.
 */
import { getListsForView, getRecipesForView } from '../../db/repositories'
import { requestJson, SYNC_ENDPOINTS } from '../../sync/engine/transport'
import { formatRelativeTime } from '../../utils/relativeTime'

definePageMeta({ layout: 'app' })

const { profile, isSignedIn, signOut } = useAuth()
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
  recipeImageById.value = new Map(recipes.map(row => [row.id, row.imagePath]))
  await reloadBadges()
}

interface ServerStatus {
  lists: number
  recipes: number
  badges: number
  images: number
}

/** `null` heisst: noch nicht geladen oder nicht erreichbar. */
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
  if (!isSignedIn.value) return
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
  void loadServerStatus()
})

watch(dataVersion, () => {
  void reloadLocal()
})

/* ------------------------------------------------------------------ *
 * Darstellung
 * ------------------------------------------------------------------ */

/** Erster Buchstabe für Badge-Kacheln ohne Bild und für den Avatar. */
function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function badgeImageUrl(recipeId: string, badgeImagePath: string | null): string | null {
  const current = recipeImageById.value.get(recipeId)
  return resolveRecipeImageUrl(current ?? badgeImagePath)
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '' : dateFormat.format(parsed)
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

/**
 * Goldrahmen der Badge-Kacheln — dieselben Farbstufen wie Androids
 * BadgeScreen (B8860B, FFD700, FFE88D, FFD700, B8860B).
 */
const GOLD_BORDER = 'linear-gradient(135deg, #B8860B, #FFD700, #FFE88D, #FFD700, #B8860B)'
</script>

<template>
  <!-- Kein eigener Scroll-Container: Für Seiten ohne eigenen scrollt das <main> des Layouts. -->
  <div>
    <div class="mx-auto w-full max-w-3xl pb-10">
      <AppPageHeader title="Mein Profil" />

      <!-- Konto -->
      <section class="px-5 pb-2">
        <div
          class="flex items-center gap-4 rounded-xl p-4 shadow-sm"
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
          <div class="min-w-0 grow">
            <p class="truncate text-[1.25rem] font-bold">
              {{ profile?.displayName ?? (isSignedIn ? profile?.email : 'Nicht angemeldet') }}
            </p>
            <p
              class="truncate text-[1rem]"
              style="color: var(--md-on-surface-variant)"
            >
              {{ isSignedIn ? profile?.email : 'Melde dich an, um zu synchronisieren' }}
            </p>
          </div>
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
          class="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <li
            v-for="badge in badges"
            :key="badge.id"
          >
            <!-- Goldrahmen wie in Android: 3px Verlaufsrand um die Kachel. -->
            <div
              class="rounded-xl p-[3px]"
              :style="{ background: GOLD_BORDER }"
            >
              <div
                class="overflow-hidden rounded-[9px]"
                style="background-color: var(--md-surface)"
              >
                <img
                  v-if="badgeImageUrl(badge.recipeId, badge.recipeImagePath)"
                  :src="badgeImageUrl(badge.recipeId, badge.recipeImagePath) ?? undefined"
                  alt=""
                  loading="lazy"
                  class="h-20 w-full object-cover"
                >
                <div
                  v-else
                  class="flex h-20 w-full items-center justify-center text-[1.5rem] font-bold text-white"
                  :style="{ backgroundColor: badge.recipeColor }"
                >
                  {{ initialOf(badge.recipeName) }}
                </div>
                <div class="px-2 py-1.5 text-center">
                  <p class="truncate text-[1rem] font-bold">
                    {{ badge.recipeName }}
                  </p>
                  <p
                    class="text-[0.9375rem]"
                    style="color: var(--md-on-surface-variant)"
                  >
                    {{ formatDate(badge.earnedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Einladungen -->
      <section class="px-5 pt-8">
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

      <!-- Synchronisation -->
      <section class="px-5 pt-8">
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
