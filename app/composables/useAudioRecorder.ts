/**
 * Audioaufnahme über getUserMedia + MediaRecorder.
 *
 * Generisch gehalten: Die Listen-Sheets benutzen ihn heute, das Rezept-Paket
 * kann ihn unverändert übernehmen — der Composable kennt weder Listen noch
 * Rezepte, er liefert nur eine fertige Aufnahme.
 *
 * Zum Dateinamen: Die Endung bestimmt, welches Format das Transkriptions-
 * modell der API annimmt. Chrome und Firefox nehmen `audio/webm` auf, Safari
 * nur `audio/mp4` — der Name wird deshalb aus dem TATSÄCHLICHEN mimeType des
 * Recorders abgeleitet, nicht aus dem Wunsch-Format.
 */

/** Eine abgeschlossene Aufnahme, bereit für den Upload. */
export interface AudioRecording {
  blob: Blob
  /** z.B. `recording.webm` — Endung passend zum echten mimeType. */
  fileName: string
  mimeType: string
  durationSeconds: number
}

/** Aufnahmedauer als m:ss, z.B. `0:07` oder `1:23`. */
export function formatRecordingDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** In Reihenfolge der Präferenz; das erste unterstützte Format gewinnt. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const

function fileNameFor(mimeType: string): string {
  // `audio/mp4` ist ein reiner Audio-Container — als Datei heißt das m4a.
  if (mimeType.startsWith('audio/mp4')) return 'recording.m4a'
  return 'recording.webm'
}

function permissionMessage(cause: unknown): string {
  if (cause instanceof DOMException) {
    if (cause.name === 'NotAllowedError' || cause.name === 'SecurityError') {
      return 'Zugriff auf das Mikrofon wurde verweigert. Erlaube ihn in den Browser-Einstellungen und versuche es erneut.'
    }
    if (cause.name === 'NotFoundError') {
      return 'Es wurde kein Mikrofon gefunden.'
    }
    if (cause.name === 'NotReadableError') {
      return 'Das Mikrofon wird gerade von einer anderen Anwendung benutzt.'
    }
  }
  return 'Das Mikrofon konnte nicht gestartet werden.'
}

export function useAudioRecorder() {
  const isRecording = ref(false)
  const durationSeconds = ref(0)
  const error = ref<string | null>(null)

  // Bewusst kein Vue-State: Recorder, Stream und Chunks braucht keine
  // Ansicht — reaktiv sind nur Zustand, Dauer und Fehlermeldung.
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let ticker: ReturnType<typeof setInterval> | null = null
  let startedAt = 0

  function cleanup(): void {
    if (ticker !== null) {
      clearInterval(ticker)
      ticker = null
    }
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    recorder = null
    chunks = []
    isRecording.value = false
  }

  /**
   * Startet die Aufnahme. `false` heißt: nicht möglich — die Begründung
   * steht dann in `error` (verweigerte Berechtigung, kein Mikrofon, kein
   * MediaRecorder-Support).
   */
  async function start(): Promise<boolean> {
    if (isRecording.value) return true
    error.value = null

    if (typeof MediaRecorder === 'undefined' || navigator.mediaDevices?.getUserMedia === undefined) {
      error.value = 'Dieser Browser unterstützt keine Audioaufnahme.'
      return false
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    catch (cause) {
      error.value = permissionMessage(cause)
      return false
    }

    const mimeType = MIME_CANDIDATES.find(candidate => MediaRecorder.isTypeSupported(candidate))

    try {
      // Ohne unterstütztes Wunsch-Format entscheidet der Browser selbst.
      recorder = mimeType !== undefined
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    }
    catch (cause) {
      cleanup()
      error.value = permissionMessage(cause)
      return false
    }

    chunks = []
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    recorder.start()
    startedAt = Date.now()
    durationSeconds.value = 0
    ticker = setInterval(() => {
      durationSeconds.value = Math.floor((Date.now() - startedAt) / 1000)
    }, 250)
    isRecording.value = true

    return true
  }

  /**
   * Beendet die Aufnahme und liefert sie als Blob samt passendem Dateinamen.
   * `null`, wenn gerade nichts aufgenommen wird oder nichts ankam.
   */
  function stop(): Promise<AudioRecording | null> {
    const active = recorder
    if (active === null || !isRecording.value) {
      cleanup()
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      active.onstop = () => {
        // Der echte Typ kommt vom Recorder selbst; er kann Codec-Zusätze
        // tragen (audio/webm;codecs=opus), der Dateiname mappt auf die Endung.
        const mimeType = active.mimeType.length > 0 ? active.mimeType : 'audio/webm'
        const blob = new Blob(chunks, { type: mimeType })
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        cleanup()

        if (blob.size === 0) {
          error.value = 'Die Aufnahme ist leer — bitte versuche es erneut.'
          resolve(null)
          return
        }

        resolve({ blob, fileName: fileNameFor(mimeType), mimeType, durationSeconds: duration })
      }

      active.stop()
    })
  }

  /** Bricht die Aufnahme ab und verwirft alles Aufgenommene. */
  function cancel(): void {
    const active = recorder
    if (active !== null && active.state !== 'inactive') {
      active.onstop = () => {}
      active.ondataavailable = () => {}
      active.stop()
    }
    cleanup()
  }

  // Wer den Bildschirm verlässt, lässt kein offenes Mikrofon zurück.
  onScopeDispose(cancel)

  return {
    isRecording: readonly(isRecording),
    durationSeconds: readonly(durationSeconds),
    error: readonly(error),
    start,
    stop,
    cancel,
  }
}
