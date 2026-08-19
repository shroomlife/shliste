/**
 * Beobachtbarer Zustand des Abgleichs.
 *
 * WARUM OHNE VUE: Diese Datei läuft auch unter `bun test`, ohne Nuxt und ohne
 * Reaktivitätssystem. Ein `ref` hier würde die Engine an das Framework binden,
 * obwohl sie nichts davon braucht. Die Oberfläche abonniert stattdessen über
 * `subscribe()` und spiegelt das Ergebnis in ihren eigenen Zustand — die
 * Richtung der Abhängigkeit zeigt damit von der Oberfläche zur Engine und
 * nicht umgekehrt.
 */
import type { IsoUtc } from '../../../shared/types/domain'
import type { SyncError } from './errors'

/**
 * Die Zustände der Engine.
 *
 * - `idle`         — nichts zu tun, alles abgeglichen
 * - `syncing`      — ein Lauf ist unterwegs
 * - `pending`      — es warten lokale Änderungen auf ihren Push
 * - `error`        — der letzte Lauf ist gescheitert
 * - `offline`      — keine Verbindung; Änderungen bleiben lokal
 * - `authRequired` — die Sitzung ist abgelaufen, der Aufrufer meldet neu an
 */
export type SyncPhase = 'idle' | 'syncing' | 'pending' | 'error' | 'offline' | 'authRequired'

/**
 * Zwei Seiten haben Daten und beide Stände sind unterschiedlich — das kann
 * nur der Nutzer entscheiden.
 *
 * Bewusst nur Zahlen und keine Zeilen: Die Meldung soll die Entscheidung
 * ermöglichen ("dort liegen 12 Listen, hier 3"), nicht die Auflösung
 * vorwegnehmen. Welche Strategie danach läuft (zusammenführen, lokal
 * hochladen, Server übernehmen), entscheidet die Oberfläche.
 */
export interface SyncConflictReport {
  server: {
    lists: number
    recipes: number
    contentHash: string | null
    lastOverwriteAt: IsoUtc | null
  }
  local: {
    lists: number
    recipes: number
  }
}

export interface SyncSnapshot {
  phase: SyncPhase
  /** Satz für die Oberfläche, `null` wenn es nichts zu sagen gibt. */
  message: string | null
  /** Zeilen, die noch auf ihren Push warten. */
  pendingCount: number
  /**
   * Zeilen, die der Server beim letzten Push verworfen hat (fehlender
   * Zugriff, ID-Kollision). Sie bleiben schmutzig und werden erneut versucht.
   * Sichtbar, weil eine dauerhafte "nicht abgeglichen"-Anzeige besser ist als
   * stiller Verlust.
   */
  notSyncedCount: number
  /** Ende des letzten erfolgreichen Abgleichs. */
  lastSyncedAt: IsoUtc | null
  /** Nur bei 429 gesetzt: so lange lässt der Server warten. */
  retryAfterMs: number | null
  /** Gesetzt, solange eine Nutzerentscheidung aussteht. */
  conflict: SyncConflictReport | null
}

export const INITIAL_SNAPSHOT: SyncSnapshot = {
  phase: 'idle',
  message: null,
  pendingCount: 0,
  notSyncedCount: 0,
  lastSyncedAt: null,
  retryAfterMs: null,
  conflict: null,
}

export type SyncStateListener = (snapshot: SyncSnapshot) => void

export interface SyncStateStore {
  get: () => SyncSnapshot
  /**
   * Setzt einzelne Felder und benachrichtigt die Abonnenten. Ein Patch statt
   * eines vollständigen Zustands: Wer die Phase ändert, soll nicht versehentlich
   * `lastSyncedAt` mit zurücksetzen.
   */
  set: (patch: Partial<SyncSnapshot>) => void
  /** Meldet ab, indem die zurückgegebene Funktion aufgerufen wird. */
  subscribe: (listener: SyncStateListener) => () => void
}

export function createSyncStateStore(initial: SyncSnapshot = INITIAL_SNAPSHOT): SyncStateStore {
  let snapshot: SyncSnapshot = { ...initial }
  const listeners = new Set<SyncStateListener>()

  return {
    get: () => snapshot,

    set: (patch) => {
      snapshot = { ...snapshot, ...patch }
      // Über eine Kopie laufen: Ein Abonnent darf sich in seinem eigenen
      // Aufruf abmelden, ohne die laufende Schleife zu beschädigen.
      for (const listener of [...listeners]) {
        listener(snapshot)
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * Der app-weite Zustand. Ein Abgleich betrifft das ganze Gerät, nicht eine
 * einzelne Komponente — mehrere Instanzen würden sich widersprechen.
 */
export const syncState: SyncStateStore = createSyncStateStore()

/**
 * Welche Phase gehört zu diesem Fehler?
 *
 * `rateLimited`, `transient` und `permanent` landen gemeinsam auf `error`:
 * Für den Nutzer sind sie dasselbe ("hat nicht geklappt"), der Unterschied
 * steht in `message` und `retryAfterMs`. Nur `offline` und `authRequired`
 * verlangen etwas anderes von ihm — abwarten beziehungsweise neu anmelden.
 */
export function phaseFromError(error: SyncError): SyncPhase {
  switch (error.kind) {
    case 'auth':
      return 'authRequired'
    case 'offline':
      return 'offline'
    default:
      return 'error'
  }
}

/**
 * Die Zustände, die `app/components/SyncStatus.vue` kennt.
 *
 * DOPPELUNG MIT ANSAGE: Der Typ wird dort aus einer `.vue`-Datei exportiert
 * und ist damit für `bun test` nicht importierbar. Er steht deshalb hier ein
 * zweites Mal. Wer die Anzeige um einen Zustand erweitert, muss beide Stellen
 * anfassen — `toDisplayState` unten macht den Bruch beim Typecheck sichtbar.
 */
export type SyncStatusDisplay = 'synced' | 'syncing' | 'pending' | 'error' | 'offline'

/**
 * Übersetzt die Phase in die Anzeige.
 *
 * `idle` wird zu `synced`: Die Anzeige kennt kein "noch nichts getan", und
 * "nichts offen" ist genau das, was `synced` dort aussagt.
 *
 * `authRequired` wird zu `error`: Die Anzeige hat kein eigenes Symbol dafür,
 * und ein abgelaufenes Konto als "offline" darzustellen wäre eine Lüge — der
 * Nutzer würde aufs Netz warten statt sich anzumelden. Das Warndreieck ist
 * hier die ehrlichere Antwort; der Satz dazu steht in `message`.
 */
export function toDisplayState(phase: SyncPhase): SyncStatusDisplay {
  switch (phase) {
    case 'idle':
      return 'synced'
    case 'syncing':
      return 'syncing'
    case 'pending':
      return 'pending'
    case 'offline':
      return 'offline'
    case 'error':
    case 'authRequired':
      return 'error'
  }
}
