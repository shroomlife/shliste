/**
 * Der Abgleich, wie ihn die Oberfläche sieht.
 *
 * Zwei Composables mit klar getrennten Rollen:
 *
 * - `useSync()` ist die LESENDE Seite plus die Auslöser. Ueberall aufrufbar,
 *   hält selbst nichts am Laufen.
 * - `useSyncRunner()` ist die LAUFENDE Seite: Verbindung, Zeitgeber,
 *   Ereignisbehandlung. GENAU EINMAL aufrufen, im App-Layout. Ein zweiter
 *   Aufruf öffnete eine zweite Echtzeit-Verbindung, und der Server schliesst
 *   ab der sechsten Verbindung eines Kontos die jeweils älteste.
 *
 * OHNE KONTO PASSIERT HIER NICHTS. Die App ist vollständig ohne Anmeldung
 * benutzbar; der Abgleich ist ein Zusatz, kein Unterbau. Jeder Auslöser
 * prüft das, statt sich auf den Aufrufer zu verlassen — sonst liefe ein
 * Anonymer in eine Kette aus 401 und Wiederholungen.
 */
import { createRealtimeSync } from '../sync/engine/realtime'
import {
  INITIAL_SNAPSHOT,
  syncState,
  toDisplayState,
  type SyncSnapshot,
  type SyncStatusDisplay,
} from '../sync/engine/state'
import { localStore } from '../sync/engine/store'
import { syncEngine, type ConflictStrategy } from '../sync/engine/sync'
import { requestJson, SYNC_ENDPOINTS } from '../sync/engine/transport'
import type { RealtimeEvent } from '../sync/realtime/events'
import { useRealtime } from '../sync/realtime/useRealtime'

/**
 * Abstand der Ersatz-Abfrage, solange der Echtzeit-Strom nicht steht.
 *
 * Eine Minute ist der Kompromiss: kurz genug, dass eine Änderung auf einem
 * anderen Gerät nicht spürbar liegen bleibt, lang genug, dass ein dauerhaft
 * gestörter Strom den Server nicht mit Abfragen belegt.
 */
export const FALLBACK_POLL_MS = 60_000

/**
 * Wartezeit nach einer lokalen Änderung, bevor gepusht wird.
 *
 * Beim Abhaken einer Einkaufsliste fallen Änderungen in Serie an. Ohne diese
 * Pause bekäme der Server je Haken eine eigene Runde; mit ihr fasst ein Push
 * zusammen, was in derselben Handbewegung entstanden ist.
 */
export const MUTATION_DEBOUNCE_MS = 1_500

/**
 * Der Zeitgeber der Verzögerung.
 *
 * Auf Modulebene und nicht in `useState`: Er ist kein Zustand, den eine
 * Ansicht anzeigt, sondern ein Handle. Auf dem Server wird er nie gesetzt
 * (`scheduleSync` kehrt dort sofort zurück), ein Uebersprechen zwischen
 * Anfragen ist damit ausgeschlossen.
 */
let mutationTimer: ReturnType<typeof setTimeout> | null = null

/* ------------------------------------------------------------------ *
 * Lesende Seite und Auslöser
 * ------------------------------------------------------------------ */

export interface UseSync {
  /** Der letzte gemeldete Zustand der Engine. */
  snapshot: Readonly<Ref<SyncSnapshot>>
  /** Für `SyncStatus.vue`. */
  display: ComputedRef<SyncStatusDisplay>
  /**
   * Zähler, der nach jeder Änderung an den lokalen Daten steigt.
   *
   * Ansichten beobachten ihn und lesen dann neu. Bewusst ein Zähler und kein
   * Ereignisbus: Die Engine schiebt keine Daten in die Oberfläche, die
   * Oberfläche holt sie sich — dieselbe Richtung wie beim übrigen Lesen aus
   * der lokalen Datenbank.
   */
  dataVersion: Readonly<Ref<number>>
  /** Sofort abgleichen. Ohne Konto folgenlos. */
  requestSync: () => Promise<void>
  /** Nach einer lokalen Änderung: abgleichen, aber gesammelt. */
  scheduleSync: () => void
  /**
   * Beantwortet die Frage, welcher Stand gilt, und gleicht danach ab.
   *
   * Nur auf eine ausdrückliche Entscheidung des Nutzers hin aufrufen: Zwei
   * der drei Wege verwerfen Daten (siehe `ConflictStrategy`).
   */
  resolveConflict: (strategy: ConflictStrategy) => Promise<void>
}

export function useSync(): UseSync {
  const snapshot = useState<SyncSnapshot>('sync-snapshot', () => INITIAL_SNAPSHOT)
  const dataVersion = useState<number>('sync-data-version', () => 0)
  const { isSignedIn } = useAuth()

  async function requestSync(): Promise<void> {
    if (import.meta.server || !isSignedIn.value) return

    const outcome = await syncEngine.sync()
    // `ran: false` heisst, dass bereits ein Lauf unterwegs war. Dessen
    // Ergebnis kommt über das Abonnement, hier ist nichts zu tun.
    if (outcome.ran) dataVersion.value += 1
  }

  function scheduleSync(): void {
    if (import.meta.server || !isSignedIn.value) return

    if (mutationTimer !== null) clearTimeout(mutationTimer)
    mutationTimer = setTimeout(() => {
      mutationTimer = null
      void requestSync().catch(reportSyncFailure)
    }, MUTATION_DEBOUNCE_MS)
  }

  async function resolveConflict(strategy: ConflictStrategy): Promise<void> {
    if (import.meta.server) return

    const outcome = await syncEngine.resolveConflict(strategy)
    if (outcome.ran) dataVersion.value += 1
  }

  return {
    snapshot: readonly(snapshot),
    display: computed(() => toDisplayState(snapshot.value.phase)),
    dataVersion: readonly(dataVersion),
    requestSync,
    scheduleSync,
    resolveConflict,
  }
}

/* ------------------------------------------------------------------ *
 * Laufende Seite
 * ------------------------------------------------------------------ */

/**
 * Hält den Abgleich am Laufen: spiegelt den Zustand der Engine, verbindet den
 * Echtzeit-Strom und löst bei den bekannten Anlässen aus.
 *
 * DIE ANLÄSSE, und warum es genau diese sind:
 * - Anmeldung und App-Start — der erste Blick auf fremde Änderungen
 * - Rückkehr in den Vordergrund — während der Strom geschlossen war, ist
 *   möglicherweise etwas passiert
 * - Netz wieder da — Ungesendetes soll nicht auf die nächste Handlung warten
 * - Echtzeit-Ereignis — der eigentliche Zweck des ganzen Umbaus
 * - Ersatz-Abfrage, solange der Strom nicht steht
 */
export function useSyncRunner(): void {
  const snapshot = useState<SyncSnapshot>('sync-snapshot', () => INITIAL_SNAPSHOT)
  const dataVersion = useState<number>('sync-data-version', () => 0)
  const { isSignedIn } = useAuth()
  const { isOnline } = useNetworkStatus()
  const { requestSync } = useSync()

  const fetchDelta = (query: string): Promise<unknown> =>
    requestJson(`${SYNC_ENDPOINTS.delta}?${query}`)

  const realtimeSync = createRealtimeSync({
    store: localStore,
    fetchDelta,
    runFullSync: () => syncEngine.sync(),
    onApplied: () => {
      dataVersion.value += 1
    },
  })

  /**
   * Ein gescheiterter Delta-Abruf fällt auf den vollen Lauf zurück.
   *
   * Selbstheilend statt still: Der Grund kann ein abgelaufenes Ticket, ein
   * Netzaussetzer oder eine veränderte Mitgliedschaft sein. Der volle Lauf
   * klärt alle drei Fälle und meldet, falls auch er scheitert, über den
   * Zustand der Engine.
   */
  async function handleEvents(events: RealtimeEvent[]): Promise<void> {
    try {
      await realtimeSync.handleEvents(events)
    }
    catch (error) {
      console.warn('[Sync] Delta-Abruf fehlgeschlagen, es folgt ein vollständiger Abgleich:', error)
      await requestSync()
    }
  }

  const { isDegraded } = useRealtime({
    isSignedIn: () => isSignedIn.value,
    onEvents: (events) => {
      void handleEvents(events).catch(reportSyncFailure)
    },
  })

  /** Läuft nur, solange der Echtzeit-Strom nicht zur Verfügung steht. */
  let fallbackTimer: ReturnType<typeof setInterval> | null = null

  function stopFallbackPolling(): void {
    if (fallbackTimer === null) return
    clearInterval(fallbackTimer)
    fallbackTimer = null
  }

  function startFallbackPolling(): void {
    if (fallbackTimer !== null) return
    fallbackTimer = setInterval(() => {
      void requestSync().catch(reportSyncFailure)
    }, FALLBACK_POLL_MS)
  }

  function syncNow(): void {
    void requestSync().catch(reportSyncFailure)
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') syncNow()
  }

  onMounted(() => {
    // Der Zustand der Engine lebt ausserhalb von Vue (siehe `state.ts`) und
    // wird hier gespiegelt. Die Richtung der Abhängigkeit zeigt damit von der
    // Oberfläche zur Engine, nicht umgekehrt.
    const unsubscribe = syncState.subscribe((next) => {
      snapshot.value = next
    })
    snapshot.value = syncState.get()

    document.addEventListener('visibilitychange', handleVisibilityChange)

    onBeforeUnmount(() => {
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopFallbackPolling()
    })

    if (isSignedIn.value) syncNow()
  })

  // Anmelden löst den ersten Abgleich aus, Abmelden beendet die Ersatzabfrage.
  watch(isSignedIn, (signedIn) => {
    if (signedIn) {
      syncNow()
      return
    }
    stopFallbackPolling()
  })

  // Nur die Flanke nach online zählt: Beim Wechsel nach offline gibt es
  // nichts zu holen, und ein Versuch endete ohnehin im Fehlerzustand.
  watch(isOnline, (online, wasOnline) => {
    if (online && !wasOnline) syncNow()
  })

  watch(isDegraded, (degraded) => {
    if (degraded && isSignedIn.value) {
      startFallbackPolling()
      return
    }
    stopFallbackPolling()
  })
}

/**
 * Ein gescheiterter Abgleich ist kein Grund, die App anzuhalten.
 *
 * Die Engine hat den Fehler bereits in ihren Zustand geschrieben, die
 * Oberfläche zeigt ihn an. Hier bleibt nur die Konsole — aber eben nicht ein
 * stillschweigend verschlucktes Versprechen.
 */
function reportSyncFailure(error: unknown): void {
  console.error('[Sync] Abgleich fehlgeschlagen:', error)
}
