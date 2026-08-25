/**
 * Der Abgleich, wie ihn die Oberfläche sieht.
 *
 * Zwei Composables mit klar getrennten Rollen:
 *
 * - `useSync()` ist die LESENDE Seite plus die Auslöser. Überall aufrufbar,
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
import { evaluateIntegrity } from '../sync/engine/integrity'
import { parseServerStatus, syncEngine, type ConflictStrategy, type SyncRunOptions } from '../sync/engine/sync'
import { computeContentHashes, divergentAreas } from '../sync/merge/content-hash'
import {
  countDirtyContent,
  getAllForContentHash,
  getLastChangeSeq,
  getSelfHealMarker,
  setLastSyncedAt,
  setSelfHealAttempt,
  setSelfHealSuccess,
} from '~/db/repositories'
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
 * Kurz, weil jede Sync-Mutation dieser App eine DISKRETE Aktion ist —
 * abhaken, anlegen, löschen, umsortieren. Texte speichert die UI erst beim
 * Bestätigen, einen Tastendruck-Strom gibt es im Sync-Pfad nicht; ein
 * längeres Fenster schützte also vor nichts und war nur als Sende-Latenz
 * spürbar. 500 ms bündeln weiterhin den typischen Abhak-Burst zu einem Push
 * und sind derselbe Wert wie der Dirty-Observer der Android-App — beide
 * Richtungen fühlen sich damit gleich schnell an.
 *
 * Kommt je kontinuierliche Eingabe in den Sync-Pfad (Live-Editor), gehört
 * hier ein zweites, längeres Fenster nur für diese Klasse hin — nicht ein
 * längeres für alle.
 */
export const MUTATION_DEBOUNCE_MS = 500

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
 * (`scheduleSync` kehrt dort sofort zurück), ein Übersprechen zwischen
 * Anfragen ist damit ausgeschlossen.
 */
let mutationTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Die zuletzt aus einem Herzschlag verarbeitete Änderungsnummer.
 *
 * Nur für die Dämpfung in `handleServerChangeSeq` — bewusst im Arbeitsspeicher
 * und neben dem Zeitgeber darüber: Nach einem Neuladen darf es ruhig wieder
 * einen Versuch geben.
 */
let zuletztGemeldeteSeq: number | null = null

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
  /**
   * Sofort abgleichen. Ohne Konto folgenlos.
   *
   * `userInitiated: true` für den Knopf: Der Lauf stellt sich dann an, statt
   * aufzugeben, wenn gerade ein anderer Tab abgleicht.
   */
  requestSync: (options?: SyncRunOptions) => Promise<void>
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

  async function requestSync(options: SyncRunOptions = {}): Promise<void> {
    if (import.meta.server || !isSignedIn.value) return

    await syncEngine.sync(options)

    /*
     * DIE ANSICHTEN LESEN IN BEIDEN FÄLLEN NEU.
     *
     * `ran: false` hiess früher nur "in diesem Tab läuft schon einer", und
     * dessen Ergebnis kam über das Abonnement. Seit der Tab-Sperre heisst es
     * auch: "ein ANDERER Tab arbeitet gerade" — und dessen Abonnement erreicht
     * uns nicht, es gibt keinen BroadcastChannel. Ohne dieses Signal blieben
     * die Ansichten auf einem Stand stehen, den die Datenbank längst nicht mehr
     * hat.
     */
    dataVersion.value += 1
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

  /**
   * Einmal je Seitensitzung den eigenen Bestand gegen den Server halten.
   *
   * WARUM ÜBERHAUPT: Ein inkrementeller Abruf fragt nach Änderungen seit einem
   * Zeitpunkt. Eine ältere schiefe Zeile kommt darin nie wieder vor — nur ein
   * voller Abruf erreicht sie. Ohne diese Prüfung bliebe so etwas im Browser
   * unbemerkt, während die Android-App es findet: eine Asymmetrie, die genau
   * dann auffällt, wenn man sie am wenigsten gebrauchen kann.
   *
   * WARUM NUR EINMAL: Eine Abweichung ist ein bleibender Zustand, kein
   * flüchtiger. Einmal danach zu sehen genügt, um sie zu finden. Nach jedem
   * Abgleich zu prüfen köstete jedes Mal eine zusätzliche Anfrage, ohne mehr
   * zu erfahren.
   *
   * Fehler bleiben hier folgenlos: Die Prüfung ist eine Zugabe, kein
   * Bestandteil des Abgleichs.
   */
  let integrityChecked = false

  async function checkIntegrityOnce(): Promise<void> {
    if (import.meta.server || integrityChecked || !isSignedIn.value) return
    integrityChecked = true

    const [status, lokal, offene, marker] = await Promise.all([
      requestJson(SYNC_ENDPOINTS.status).then(parseServerStatus),
      getAllForContentHash().then(computeContentHashes),
      countDirtyContent(),
      getSelfHealMarker(),
    ])

    const urteil = evaluateIntegrity({
      serverHash: status.contentHashV2,
      localHash: lokal.v2,
      pendingChanges: offene,
      lastHealedHash: marker.hash,
      lastHealedAt: marker.at,
      now: Date.now(),
    })

    // „In Ordnung" und „nicht beurteilbar" sind beide kein Anlass. Und eine
    // Abweichung, die noch nicht hochgeladene Zeilen erklären, ist der
    // Normalzustand — das erledigt der nächste Upload von selbst.
    if (urteil.kind !== 'heal' && urteil.kind !== 'already-tried') return

    const bereiche = divergentAreas(status.contentHashParts, lokal.parts)
    const benannt = bereiche.length > 0 ? bereiche.join(', ') : 'unbekannt'

    if (urteil.kind === 'already-tried') {
      console.warn(`[Sync] Abweichung besteht fort (${urteil.reason}) — Bereich(e): ${benannt}`)
      return
    }

    console.warn(`[Sync] Inhalts-Abweichung → voller Serverabgleich. Bereich(e): ${benannt}`)

    // Cursor zurücksetzen heisst: der nächste Abruf holt alles. Das ist hier
    // NICHT destruktiv — ein voller Abruf verwirft nichts, sondern führt
    // zusammen, und Zeilen mit offenen Änderungen bleiben unangetastet.
    await setLastSyncedAt(null)

    /*
     * DEN VERSUCH ZUERST VERMERKEN, DAS ERGEBNIS DANACH.
     *
     * Die beiden Marken bedeuten Verschiedenes, und genau das löst zwei
     * Fehler auf, die sich sonst gegenseitig ausschliessen:
     *
     * - Der Zeitstempel zählt VERSUCHE. Er steht vor dem Lauf, damit ein
     *   dauerhaft scheiternder Abgleich nicht bei jedem Anlass erneut einen
     *   vollständigen Abruf auslöst — die Zeitschranke bremst ihn.
     * - Die Prüfsumme zählt ERFOLGE. Sie sperrt genau diesen Serverstand
     *   dauerhaft; ein Fehlschlag darf sie deshalb nicht setzen, sonst bliebe
     *   die Abweichung für immer unrepariert und niemand sähe einen Fehler.
     *
     * Vorher wurde bei einem Fehlschlag KEINE von beiden gesetzt. Das
     * verhinderte zwar die dauerhafte Sperre, öffnete aber die Endlosschleife.
     * Dieselbe Trennung gilt in Androids IntegrityPolicy, wo beide Sperren seit
     * jeher so dokumentiert sind.
     *
     * EIN NICHT GELAUFENER VERSUCH ZÄHLT ABER NICHT. Hält ein anderer Tab die
     * Sperre, hat hier nichts stattgefunden — die Marke stehenzulassen bremste
     * die Selbstheilung dann zwölf Stunden lang wegen eines Laufs, den es nie
     * gab. Deshalb wird der vorherige Wert wiederhergestellt.
     */
    await setSelfHealAttempt(Date.now())

    const ergebnis = await syncEngine.sync()
    if (!ergebnis.ran) {
      // Es lief bereits etwas — hier oder in einem anderen Tab. Dann gehört der
      // Lauf nicht uns: Die Prüfung wird wieder freigegeben und der Versuch
      // zurückgenommen.
      await setSelfHealAttempt(marker.at === 0 ? null : marker.at)
      integrityChecked = false
      return
    }

    /*
     * `ran: true` heisst nur "dieser Lauf gehörte mir", nicht "er hat
     * geklappt": Ein Fehler im Zyklus wird gefangen und landet als Phase im
     * Zustand, der Rückgabewert bleibt derselbe.
     */
    const phase = ergebnis.snapshot.phase
    if (phase === 'error' || phase === 'offline' || phase === 'authRequired') {
      console.warn(`[Sync] Selbstheilung nicht abgeschlossen (${phase}) — die Zeitschranke bremst den nächsten Versuch.`)
      return
    }

    if (status.contentHashV2 !== null) {
      await setSelfHealSuccess(status.contentHashV2, Date.now())
    }
    dataVersion.value += 1
  }

  /** Nie den Abgleich aufhalten und nie die Oberfläche stören. */
  function checkIntegritySoon(): void {
    void checkIntegrityOnce().catch((error: unknown) => {
      console.warn('[Sync] Integritätsprüfung nicht möglich:', error)
    })
  }

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
    /*
     * Der Herzschlag meldet die Änderungsnummer des Kontos. Ist sie höher als
     * der eigene Stand, hat dieser Tab etwas verpasst — und zwar unabhängig
     * davon, WARUM: verlorenes Ereignis, Redis-Ausfall, verschluckter Weckruf.
     *
     * Genau das ist der Ersatz für eine transaktionale Outbox auf der
     * Serverseite. Fällt Redis aus, bleibt die Leitung offen und schlägt
     * weiter, liefert aber kein einziges Ereignis mehr; der Tab sähe eine
     * kerngesunde Verbindung und wäre trotzdem blind. Bisher fiel das erst
     * beim planmässigen Abgleich auf — nach bis zu 15 Minuten. Jetzt nach
     * höchstens einem Herzschlag.
     */
    onChangeSeq: (seq) => {
      void handleServerChangeSeq(seq).catch(reportSyncFailure)
    },
  })

  /**
   * Vergleicht die gemeldete Nummer mit dem eigenen Stand.
   *
   * Ein unbekannter eigener Stand (`null`) löst NICHTS aus: Nach einer frischen
   * Installation steht das Konto längst bei einer Zahl über null, und ein
   * Abgleich allein deshalb wäre bei jedem ersten Herzschlag einer.
   *
   * Der eigene Stand wird bewusst bei jedem Schlag frisch gelesen statt
   * zwischengespeichert. Es ist ein Primärschlüssel-Lesevorgang alle 15
   * Sekunden, und ein Zwischenspeicher müsste bei jedem Abgleich, jedem Delta
   * und jedem Kontowechsel mitgeführt werden — mehr Gelegenheiten, falsch zu
   * liegen, als der Lesevorgang kostet.
   */
  async function handleServerChangeSeq(seq: number): Promise<void> {
    if (!isSignedIn.value) return

    /*
     * DÄMPFUNG: Dieselbe Zahl löst höchstens einen Lauf aus.
     *
     * Der Lauf schreibt seinen Stand nur fort, wenn er den Cursor vorrücken
     * durfte — bei einer gekappten Antwort, an der Seitengrenze und bei jedem
     * Fehler bleibt die gespeicherte Zahl also stehen. Ohne diese Bremse fiele
     * die App danach in einen vollen Abgleich alle 15 Sekunden, statt wie
     * vorher alle 15 Minuten.
     */
    if (seq === zuletztGemeldeteSeq) return

    const eigener = await getLastChangeSeq()
    if (eigener === null || seq === eigener) return

    /*
     * Kleiner als der eigene Stand ist KEIN Grund zum Nichtstun.
     *
     * Der Zähler wächst je Nutzer monoton — ausser der Server wurde aus einer
     * Sicherung wiederhergestellt. Dann hält dieses Gerät eine Zahl, die es
     * nicht mehr gibt, und der Vergleich meldete für genau so viele Änderungen
     * keine Lücke, wie zurückgedreht wurden. Ein Abgleich schreibt den Stand
     * unbedingt neu und bringt beide Seiten wieder zusammen.
     */
    zuletztGemeldeteSeq = seq
    await requestSync()
  }

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

  /**
   * Erst prüfen, wenn ein Abgleich durch ist.
   *
   * Vorher wäre jede Abweichung nur der noch nicht gelaufene Abgleich selbst —
   * ein Befund, der sich Sekunden später von allein erledigt.
   */
  watch(() => snapshot.value.phase, (phase, previous) => {
    if (previous === 'syncing' && phase === 'idle') checkIntegritySoon()
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
