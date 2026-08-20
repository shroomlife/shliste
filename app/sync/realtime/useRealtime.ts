/**
 * Echtzeit-Anbindung für Komponenten.
 *
 * Verdrahtet die drei Teile: Ticket holen, Verbindung halten, Ereignisse
 * bündeln. Was danach passiert, entscheidet der Aufrufer, denn dieses
 * Composable holt bewusst KEINE Daten. Die Ereignisse sind Hinweise, und der
 * Abruf des Deltas gehört in die Sync-Engine, nicht in die Verbindung.
 *
 * GENAU EINMAL AUFRUFEN, sinnvollerweise im App-Layout. Jeder Aufruf öffnet
 * eine eigene Verbindung, und der Server schliesst ab der sechsten Verbindung
 * eines Kontos die jeweils älteste.
 *
 * Braucht eine Komponenteninstanz: `onMounted` und `onBeforeUnmount` binden
 * die Verbindung an deren Lebensdauer.
 */
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import { createRealtimeConnection, type RealtimeStatus } from './connection'
import { createEventCoalescer } from './coalesce'
import type { RealtimeEvent } from './events'

export interface UseRealtimeOptions {
  /**
   * Ob eine Sitzung besteht. Ohne Konto gibt es keinen Stream, und ein
   * Ticket-Abruf ohne Sitzung liefe in eine Endlosschleife aus 401 und Backoff.
   */
  isSignedIn: MaybeRefOrGetter<boolean>
  /**
   * Die gebündelten Ereignisse eines Sammelfensters, in der Reihenfolge ihres
   * ersten Auftretens. Hier holt der Aufrufer das Delta.
   */
  onEvents: (events: RealtimeEvent[]) => void
  /**
   * Basisadresse der API für den Strom.
   *
   * Wird hereingereicht statt aus `runtimeConfig.public` gelesen: Der
   * App-Bereich wird vorgerendert, und dabei backt Nuxt die öffentliche
   * Konfiguration zur BAUZEIT ein — im Docker-Build, wo keine
   * Umgebungsvariablen stehen. Der Aufrufer holt den Wert zur Laufzeit vom
   * eigenen Server.
   */
  apiBase: MaybeRefOrGetter<string>
}

export interface UseRealtime {
  status: ComputedRef<RealtimeStatus>
  /**
   * Der Stream fällt wiederholt aus. Der Aufrufer sollte auf Abfrage im
   * Minutentakt zurückfallen, bis wieder `false`.
   *
   * Setzt sich beim nächsten erfolgreichen Verbindungsaufbau von selbst zurück.
   */
  isDegraded: ComputedRef<boolean>
}

/**
 * Holt ein frisches Einmal-Ticket bei der eigenen BFF.
 *
 * Die Antwort kommt aus einem fremden Prozess und wird deshalb eingeengt statt
 * behauptet. Ein unerwartetes Format ist ein Fehler und landet im Backoff, statt
 * eine Adresse mit `undefined` als Ticket zu bauen.
 */
async function requestTicket(): Promise<string> {
  const payload: unknown = await $fetch('/api/realtime/ticket', { method: 'POST' })

  if (
    typeof payload !== 'object'
    || payload === null
    || !('ticket' in payload)
    || typeof payload.ticket !== 'string'
    || payload.ticket.length === 0
  ) {
    throw new Error('Unerwartete Antwort beim Echtzeit-Ticket.')
  }

  return payload.ticket
}

export function useRealtime(options: UseRealtimeOptions): UseRealtime {
  const status = ref<RealtimeStatus>('idle')
  const isDegraded = ref(false)

  const coalescer = createEventCoalescer((events) => {
    options.onEvents(events)
  })

  const connection = createRealtimeConnection({
    apiBase: toValue(options.apiBase),
    requestTicket,
    onEvent: (event) => {
      coalescer.push(event)
    },
    onStatus: (next) => {
      status.value = next
      // Eine stehende Verbindung ist der Beweis, dass Echtzeit wieder geht.
      if (next === 'open') isDegraded.value = false
    },
    onDegraded: () => {
      isDegraded.value = true
    },
  })

  /**
   * Ein Hintergrund-Tab soll keine Verbindung halten: Sie zählt gegen das
   * Limit von fünf Verbindungen je Konto und würde einem aktiven Gerät den
   * Platz nehmen. Verpasstes holt die Nachlieferung über den Cursor.
   */
  let isVisible = true

  function shouldRun(): boolean {
    return toValue(options.isSignedIn) && isVisible
  }

  /** Bringt die Verbindung mit Sitzung und Sichtbarkeit in Einklang. */
  function reconcile(): void {
    // `EventSource` gibt es auf dem Server nicht. `onMounted` läuft dort zwar
    // ohnehin nie, der Watcher unten aber schon.
    if (import.meta.server) return

    if (shouldRun()) {
      connection.start()
      return
    }

    // Gesammeltes vor dem Trennen noch ausliefern statt verwerfen: Es ist
    // bereits bekannt, dass sich etwas geändert hat.
    coalescer.flush()
    connection.stop()
  }

  function handleVisibilityChange(): void {
    isVisible = document.visibilityState === 'visible'
    reconcile()
  }

  watch(() => toValue(options.isSignedIn), () => {
    reconcile()
  })

  onMounted(() => {
    if (typeof EventSource === 'undefined') {
      // Kein Stream möglich. Als dauerhaft eingeschränkt melden, damit der
      // Aufrufer von vornherein auf Abfrage im Minutentakt setzt.
      isDegraded.value = true
      return
    }

    isVisible = document.visibilityState === 'visible'
    document.addEventListener('visibilitychange', handleVisibilityChange)
    reconcile()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    connection.stop()
    coalescer.cancel()
  })

  return {
    status: computed(() => status.value),
    isDegraded: computed(() => isDegraded.value),
  }
}
