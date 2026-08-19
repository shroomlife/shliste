/**
 * Der Abgleich, wie ihn die Oberflaeche sieht.
 *
 * Zwei Composables mit klar getrennten Rollen:
 *
 * - `useSync()` ist die LESENDE Seite plus die Ausloeser. Ueberall aufrufbar,
 *   haelt selbst nichts am Laufen.
 * - `useSyncRunner()` ist die LAUFENDE Seite: Verbindung, Zeitgeber,
 *   Ereignisbehandlung. GENAU EINMAL aufrufen, im App-Layout. Ein zweiter
 *   Aufruf oeffnete eine zweite Echtzeit-Verbindung, und der Server schliesst
 *   ab der sechsten Verbindung eines Kontos die jeweils aelteste.
 *
 * OHNE KONTO PASSIERT HIER NICHTS. Die App ist vollstaendig ohne Anmeldung
 * benutzbar; der Abgleich ist ein Zusatz, kein Unterbau. Jeder Ausloeser
 * prueft das, statt sich auf den Aufrufer zu verlassen — sonst liefe ein
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
import { syncEngine } from '../sync/engine/sync'
import { requestJson, SYNC_ENDPOINTS } from '../sync/engine/transport'
import type { RealtimeEvent } from '../sync/realtime/events'
import { useRealtime } from '../sync/realtime/useRealtime'

/**
 * Abstand der Ersatz-Abfrage, solange der Echtzeit-Strom nicht steht.
 *
 * Eine Minute ist der Kompromiss: kurz genug, dass eine Aenderung auf einem
 * anderen Geraet nicht spuerbar liegen bleibt, lang genug, dass ein dauerhaft
 * gestoerter Strom den Server nicht mit Abfragen belegt.
 */
export const FALLBACK_POLL_MS = 60_000

/**
 * Wartezeit nach einer lokalen Aenderung, bevor gepusht wird.
 *
 * Beim Abhaken einer Einkaufsliste fallen Aenderungen in Serie an. Ohne diese
 * Pause bekaeme der Server je Haken eine eigene Runde; mit ihr fasst ein Push
 * zusammen, was in derselben Handbewegung entstanden ist.
 */
export const MUTATION_DEBOUNCE_MS = 1_500

/**
 * Der Zeitgeber der Verzoegerung.
 *
 * Auf Modulebene und nicht in `useState`: Er ist kein Zustand, den eine
 * Ansicht anzeigt, sondern ein Handle. Auf dem Server wird er nie gesetzt
 * (`scheduleSync` kehrt dort sofort zurueck), ein Uebersprechen zwischen
 * Anfragen ist damit ausgeschlossen.
 */
let mutationTimer: ReturnType<typeof setTimeout> | null = null

/* ------------------------------------------------------------------ *
 * Lesende Seite und Ausloeser
 * ------------------------------------------------------------------ */

export interface UseSync {
  /** Der letzte gemeldete Zustand der Engine. */
  snapshot: Readonly<Ref<SyncSnapshot>>
  /** Fuer `SyncStatus.vue`. */
  display: ComputedRef<SyncStatusDisplay>
  /**
   * Zaehler, der nach jeder Aenderung an den lokalen Daten steigt.
   *
   * Ansichten beobachten ihn und lesen dann neu. Bewusst ein Zaehler und kein
   * Ereignisbus: Die Engine schiebt keine Daten in die Oberflaeche, die
   * Oberflaeche holt sie sich — dieselbe Richtung wie beim uebrigen Lesen aus
   * der lokalen Datenbank.
   */
  dataVersion: Readonly<Ref<number>>
  /** Sofort abgleichen. Ohne Konto folgenlos. */
  requestSync: () => Promise<void>
  /** Nach einer lokalen Aenderung: abgleichen, aber gesammelt. */
  scheduleSync: () => void
}

export function useSync(): UseSync {
  const snapshot = useState<SyncSnapshot>('sync-snapshot', () => INITIAL_SNAPSHOT)
  const dataVersion = useState<number>('sync-data-version', () => 0)
  const { isSignedIn } = useAuth()

  async function requestSync(): Promise<void> {
    if (import.meta.server || !isSignedIn.value) return

    const outcome = await syncEngine.sync()
    // `ran: false` heisst, dass bereits ein Lauf unterwegs war. Dessen
    // Ergebnis kommt ueber das Abonnement, hier ist nichts zu tun.
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

  return {
    snapshot: readonly(snapshot),
    display: computed(() => toDisplayState(snapshot.value.phase)),
    dataVersion: readonly(dataVersion),
    requestSync,
    scheduleSync,
  }
}

/* ------------------------------------------------------------------ *
 * Laufende Seite
 * ------------------------------------------------------------------ */

/**
 * Haelt den Abgleich am Laufen: spiegelt den Zustand der Engine, verbindet den
 * Echtzeit-Strom und loest bei den bekannten Anlaessen aus.
 *
 * DIE ANLAESSE, und warum es genau diese sind:
 * - Anmeldung und App-Start — der erste Blick auf fremde Aenderungen
 * - Rueckkehr in den Vordergrund — waehrend der Strom geschlossen war, ist
 *   moeglicherweise etwas passiert
 * - Netz wieder da — Ungesendetes soll nicht auf die naechste Handlung warten
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
   * Ein gescheiterter Delta-Abruf faellt auf den vollen Lauf zurueck.
   *
   * Selbstheilend statt still: Der Grund kann ein abgelaufenes Ticket, ein
   * Netzaussetzer oder eine veraenderte Mitgliedschaft sein. Der volle Lauf
   * klaert alle drei Faelle und meldet, falls auch er scheitert, ueber den
   * Zustand der Engine.
   */
  async function handleEvents(events: RealtimeEvent[]): Promise<void> {
    try {
      await realtimeSync.handleEvents(events)
    }
    catch (error) {
      console.warn('[Sync] Delta-Abruf fehlgeschlagen, es folgt ein vollstaendiger Abgleich:', error)
      await requestSync()
    }
  }

  const { isDegraded } = useRealtime({
    isSignedIn: () => isSignedIn.value,
    onEvents: (events) => {
      void handleEvents(events).catch(reportSyncFailure)
    },
  })

  /** Laeuft nur, solange der Echtzeit-Strom nicht zur Verfuegung steht. */
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
    // wird hier gespiegelt. Die Richtung der Abhaengigkeit zeigt damit von der
    // Oberflaeche zur Engine, nicht umgekehrt.
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

  // Anmelden loest den ersten Abgleich aus, Abmelden beendet die Ersatzabfrage.
  watch(isSignedIn, (signedIn) => {
    if (signedIn) {
      syncNow()
      return
    }
    stopFallbackPolling()
  })

  // Nur die Flanke nach online zaehlt: Beim Wechsel nach offline gibt es
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
 * Oberflaeche zeigt ihn an. Hier bleibt nur die Konsole — aber eben nicht ein
 * stillschweigend verschlucktes Versprechen.
 */
function reportSyncFailure(error: unknown): void {
  console.error('[Sync] Abgleich fehlgeschlagen:', error)
}
