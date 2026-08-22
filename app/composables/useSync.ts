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
import type { RealtimeStatus } from '../sync/realtime/connection'
import type { RealtimeEvent } from '../sync/realtime/events'
import { useRealtime } from '../sync/realtime/useRealtime'

/** Verbindungszustand des Echtzeit-Stroms, wie die Anzeige ihn braucht. */
export interface RealtimeStatusView {
  status: RealtimeStatus
  /** Der Strom scheitert wiederholt — es läuft die Ersatz-Abfrage. */
  isDegraded: boolean
}

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
 * Abstand des regelmässigen Sicherheitsabgleichs — auch bei gesund
 * aussehender Echtzeit-Verbindung.
 *
 * WARUM ES IHN BRAUCHT: Die Ersatz-Abfrage oben springt erst an, wenn die
 * Verbindung als gestört GEMELDET ist, und das geschieht erst nach drei
 * Fehlversuchen. Eine stehende, aber verstopfte Verbindung meldet gar nichts:
 * Der Server verwirft Ereignisse, die er nicht loswird, ersatzlos und liefert
 * sie erst beim nächsten Verbindungsaufbau nach. Ein sichtbarer Tab könnte so
 * beliebig lange veraltet dastehen, ohne dass irgendetwas danach aussieht.
 *
 * WARUM AUSGERECHNET FÜNFZEHN MINUTEN: Dieselbe Grössenordnung wie der
 * periodische Job der Android-App, und aus demselben Grund. Das hier ist kein
 * Ersatz für die Echtzeit, sondern das Netz darunter — Änderungen kommen im
 * Normalfall in Sekunden an. Ein Tab, der den ganzen Tag offen steht, kostet
 * damit vier Abfragen je Stunde statt sechzig bei einem Minutentakt; kürzer
 * wäre Aufwand ohne spürbaren Gewinn, deutlich länger liesse einen stillen
 * Ausfall über eine ganze Arbeitssitzung stehen.
 *
 * Sparsam gehalten: Der Zeitgeber löst nur bei sichtbarem Tab und bestehender
 * Sitzung aus (siehe `useSyncRunner`).
 */
export const RECONCILE_INTERVAL_MS = 15 * 60_000

/**
 * Der Zeitgeber der Verzögerung.
 *
 * Auf Modulebene und nicht in `useState`: Er ist kein Zustand, den eine
 * Ansicht anzeigt, sondern ein Handle. Auf dem Server wird er nie gesetzt
 * (`scheduleSync` kehrt dort sofort zurück), ein Uebersprechen zwischen
 * Anfragen ist damit ausgeschlossen.
 */
let mutationTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Sichtbarkeit des Blatts „Deine Anmeldung ist abgelaufen"
 * (SessionExpiredSheet.vue).
 *
 * Als eigenes Composable statt eines nackten String-Schlüssels an zwei
 * Stellen: Der Runner öffnet das Blatt, wenn die Engine `authRequired`
 * meldet, die Komponente zeigt und schliesst es — beide greifen über diese
 * eine Funktion auf denselben `useState` zu, ein Tippfehler im Schlüssel
 * kann sie nicht auseinanderlaufen lassen.
 */
export function useSessionExpiredSheet(): Ref<boolean> {
  return useState<boolean>('session-expired-sheet-open', () => false)
}

/* ------------------------------------------------------------------ *
 * Lesende Seite und Auslöser
 * ------------------------------------------------------------------ */

export interface UseSync {
  /**
   * Der letzte gemeldete Zustand der Engine.
   *
   * Als `computed` und nicht als `readonly()`: Letzteres macht auch die
   * enthaltenen Listen unveränderlich, und der Typ passt dann nicht mehr zu
   * `SyncSnapshot` — lesbar ist beides gleichermassen.
   */
  snapshot: ComputedRef<SyncSnapshot>
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
  /**
   * Zustand des Echtzeit-Stroms, gespiegelt aus dem Runner.
   *
   * `idle`, solange der Runner (noch) nicht läuft — etwa ohne Anmeldung.
   */
  realtime: ComputedRef<RealtimeStatusView>
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
  /**
   * Meldet, dass die lokale Datenbank von aussen geändert wurde.
   *
   * Für Schreibvorgänge, die nicht aus einer Ansicht kommen — heute die
   * Übernahme der alten Daten beim ersten Start. Ohne dieses Signal stünden
   * die geschriebenen Zeilen erst nach dem nächsten Seitenwechsel da.
   */
  notifyDataChanged: () => void
}

export function useSync(): UseSync {
  const snapshot = useState<SyncSnapshot>('sync-snapshot', () => INITIAL_SNAPSHOT)
  const dataVersion = useState<number>('sync-data-version', () => 0)
  const realtimeView = useState<RealtimeStatusView>('realtime-status', () => ({
    status: 'idle',
    isDegraded: false,
  }))
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

  function notifyDataChanged(): void {
    dataVersion.value += 1
  }

  return {
    snapshot: computed(() => snapshot.value),
    display: computed(() => toDisplayState(snapshot.value.phase)),
    dataVersion: readonly(dataVersion),
    realtime: computed(() => realtimeView.value),
    requestSync,
    scheduleSync,
    resolveConflict,
    notifyDataChanged,
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
 * - regelmässiger Abgleich alle fünfzehn Minuten, auch wenn der Strom gesund
 *   aussieht (siehe `RECONCILE_INTERVAL_MS`)
 */
export function useSyncRunner(): void {
  const snapshot = useState<SyncSnapshot>('sync-snapshot', () => INITIAL_SNAPSHOT)
  const dataVersion = useState<number>('sync-data-version', () => 0)
  const { isSignedIn, clientConfig, loadSession } = useAuth()
  const { isOnline } = useNetworkStatus()
  const { requestSync } = useSync()
  const isSessionExpiredOpen = useSessionExpiredSheet()

  /**
   * Sichtbarer Re-Login statt stillem Sync-Stopp (Audit K2).
   *
   * Meldet die Engine `authRequired`, ist der stille Refresh der BFF bereits
   * gescheitert — die Session ist wirklich am Ende. Zwei Dinge passieren
   * dann: `loadSession()` holt den ehrlichen Zustand vom Server (Avatar und
   * `isSignedIn` hören auf, eine tote Session anzuzeigen), und das Blatt
   * „Anmeldung abgelaufen" öffnet sich. Nur die FLANKE zählt: Wer das Blatt
   * wegwischt, soll es nicht bei jedem weiteren fehlgeschlagenen Lauf sofort
   * wieder vor sich haben — erst ein erneuter Wechsel nach `authRequired`
   * öffnet es erneut.
   */
  watch(() => snapshot.value.phase, (phase, previousPhase) => {
    if (phase !== 'authRequired' || previousPhase === 'authRequired') return
    void loadSession()
    isSessionExpiredOpen.value = true
  })

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

  const { mark } = useRecentlyChanged()

  /**
   * Spiegel des Verbindungszustands für die Anzeige (Profilseite).
   *
   * Der Strom lebt nur hier im Runner; Ansichten lesen den geteilten
   * `useState`-Schlüssel über `useSync().realtime`, statt selbst eine
   * Verbindung aufzubauen.
   */
  const realtimeView = useState<RealtimeStatusView>('realtime-status', () => ({
    status: 'idle',
    isDegraded: false,
  }))

  const { isDegraded, status: realtimeStatus } = useRealtime({
    isSignedIn: () => isSignedIn.value,
    // Zur Laufzeit vom eigenen Server, nicht aus der eingebackenen
    // Konfiguration — siehe server/api/auth/me.get.ts.
    apiBase: () => clientConfig.value.apiBase,
    onEvents: (events) => {
      // Vor dem Abruf markieren, nicht danach: Das Aufleuchten soll mit dem
      // Ereignis beginnen und nicht erst, wenn die Daten da sind — sonst
      // erschiene die Änderung vor ihrer eigenen Ankündigung.
      //
      // Auch die Liste selbst: Benennt jemand anderes sie um oder ändert ihre
      // Farbe, ist das genauso eine fremde Änderung wie ein abgehakter
      // Eintrag — und sie geschah bisher lautlos. Listen- und Eintrags-Ids
      // sind beide UUIDs und liegen deshalb gefahrlos im selben Vorrat.
      for (const event of events) {
        if (event.type === 'item_changed') mark(event.itemIds)
        if (event.type === 'list_changed') mark([event.listId])
      }

      void handleEvents(events).catch(reportSyncFailure)
    },
  })

  watchEffect(() => {
    realtimeView.value = {
      status: realtimeStatus.value,
      isDegraded: isDegraded.value,
    }
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

  /** Läuft, solange jemand angemeldet ist — unabhängig vom Zustand des Stroms. */
  let reconcileTimer: ReturnType<typeof setInterval> | null = null

  function stopReconcilePolling(): void {
    if (reconcileTimer === null) return
    clearInterval(reconcileTimer)
    reconcileTimer = null
  }

  /**
   * Der regelmässige Abgleich, der auch ohne jeden Anlass läuft.
   *
   * Die beiden Bedingungen im Zeitgeber sind der Sparsamkeit wegen da: Ein
   * Tab im Hintergrund hat niemandem etwas anzuzeigen, und ohne Sitzung liefe
   * die Abfrage in einen 401. Beim Zurückkehren in den Vordergrund gleicht
   * ohnehin `handleVisibilityChange` ab, die ausgelassene Runde fehlt also
   * nicht.
   */
  function startReconcilePolling(): void {
    if (reconcileTimer !== null) return
    reconcileTimer = setInterval(() => {
      if (document.visibilityState !== 'visible' || !isSignedIn.value) return
      void requestSync().catch(reportSyncFailure)
    }, RECONCILE_INTERVAL_MS)
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
      stopReconcilePolling()
    })

    if (isSignedIn.value) {
      syncNow()
      startReconcilePolling()
    }
  })

  // Anmelden löst den ersten Abgleich aus, Abmelden beendet beide Zeitgeber.
  watch(isSignedIn, (signedIn) => {
    if (signedIn) {
      syncNow()
      startReconcilePolling()
      return
    }
    stopFallbackPolling()
    stopReconcilePolling()
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
