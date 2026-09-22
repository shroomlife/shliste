/**
 * Die Orchestrierung: ein vollständiger Abgleich.
 *
 * Der Ablauf in Worten:
 *
 *   Sitzung sicherstellen
 *   Wurde noch nie migriert?
 *     Serverstatus holen
 *     Server leer + lokale Daten          -> einmaliger Import
 *     Server hat Daten + lokale Daten     -> Stände vergleichen, sonst Konflikt melden
 *     sonst                               -> Marker setzen und ziehen
 *   sonst: pushen (fehlertolerant), dann ziehen
 *
 * Lokale Änderungen tragen eine dauerhafte Generation. Unter der Tab-Sperre
 * wird nachgeladen, solange während des Laufs neue Arbeit dazugekommen ist.
 */
import type { IsoUtc } from '../../../shared/types/domain'
import { describeSyncError, toSyncError, type SyncError } from './errors'
import { isRecord, readBooleanOr, readIso, readNumberOr, readString } from './json'
import type { ConflictStore, SyncStore } from './ports'
import type { ContentHashes, ContentHashParts } from '../merge/content-hash'
import { computeContentHashes } from '../merge/content-hash'
import { getAllForContentHash, getWorkGeneration, completeWorkGeneration, getSelfHealMarker, setSelfHealAttempt, setSelfHealSuccess, setLastSyncedAt } from '~/db/repositories'
import { runPull, type PullOutcome } from './pull'
import { runMigrate, runPush, type NoticeSink, type PushOutcome, type PushPayload } from './push'
import { localStore } from './store'
import {
  phaseFromError,
  syncState,
  type SyncConflictReport,
  type SyncPhase,
  type SyncSnapshot,
  type SyncStateStore,
} from './state'
import { requestJson, SYNC_ENDPOINTS, type RequestOptions } from './transport'
import { runAsLeader } from './leader'
import { evaluateIntegrity } from './integrity'

/* ------------------------------------------------------------------ *
 * Antworten, die nur hier gebraucht werden
 * ------------------------------------------------------------------ */

/** Das Wesentliche aus `GET /sync/status`. */
export interface ServerStatus {
  lists: number
  recipes: number
  /** Weder Listen noch Rezepte — das Konto ist frisch. */
  isEmpty: boolean
  /** `null`, wenn der Server keinen geliefert hat. Dann ist kein Vergleich möglich. */
  contentHash: string | null
  /**
   * Die Prüfsumme über den reinen INHALT, ohne Zeilen-Zeitstempel.
   *
   * Die ältere Fassung `contentHash` hängt an jede Zeile ihren
   * Änderungszeitstempel. Unter feldgenauem Last-Write-Wins laufen diese
   * Zeitstempel zwischen Geräten zu Recht auseinander, ohne dass der Inhalt
   * abweicht — sie meldet deshalb Abweichungen, die keine sind. Auf Android
   * ist daran einmal eine Endlosschleife entstanden.
   */
  contentHashV2: string | null
  /** Je eine Teil-Summe pro Bereich — benennt, WO es auseinanderläuft. */
  contentHashParts: ContentHashParts | null
  lastOverwriteAt: IsoUtc | null
}

/** Liest die sechs Teil-Summen, oder null wenn der Server sie nicht liefert. */
function readContentHashParts(record: Record<string, unknown>): ContentHashParts | null {
  const raw = record['contentHashParts']
  if (!isRecord(raw)) return null
  const lesen = (key: string): string => {
    const value = raw[key]
    return typeof value === 'string' ? value : ''
  }
  return {
    lists: lesen('lists'),
    listItems: lesen('listItems'),
    recipes: lesen('recipes'),
    recipeIngredients: lesen('recipeIngredients'),
    recipeSteps: lesen('recipeSteps'),
    badges: lesen('badges'),
  }
}

export function parseServerStatus(value: unknown): ServerStatus {
  const record = isRecord(value) ? value : {}
  const lists = readNumberOr(record, 'lists', 0)
  const recipes = readNumberOr(record, 'recipes', 0)

  return {
    lists,
    recipes,
    // Der Server rechnet es selbst aus; die eigene Ableitung ist nur der
    // Ersatz, falls das Feld fehlt.
    isEmpty: readBooleanOr(record, 'isEmpty', lists === 0 && recipes === 0),
    contentHash: readString(record, 'contentHash'),
    contentHashV2: readString(record, 'contentHashV2'),
    contentHashParts: readContentHashParts(record),
    lastOverwriteAt: readIso(record, 'lastOverwriteAt'),
  }
}

/** Das Wesentliche aus `GET /api/auth/me`. */
export interface SessionState {
  authenticated: boolean
  /**
   * Wurde die Sitzung gerade gegen die API bestätigt? `false` heißt "nicht
   * widerlegt" und nicht "ungültig" — offline gilt sie weiter.
   */
  verified: boolean
  userId: string | null
}

export function parseSessionState(value: unknown): SessionState {
  const record = isRecord(value) ? value : {}
  const profile = record['profile']

  return {
    authenticated: readBooleanOr(record, 'authenticated', false),
    verified: readBooleanOr(record, 'verified', false),
    userId: isRecord(profile) ? readString(profile, 'userId') : null,
  }
}

/* ------------------------------------------------------------------ *
 * Die Engine
 * ------------------------------------------------------------------ */

/**
 * Mindestabstand zweier Integritätsprüfungen ohne besonderen Anlass.
 *
 * Eine Stunde statt einer Viertelstunde: Die Heilung dahinter ist auf einmal
 * je zwölf Stunden gedeckelt. Häufiger zu messen ändert nichts an dem, was am
 * Ende passieren darf — es kostet nur.
 */
export const INTEGRITY_MIN_INTERVAL_MS = 60 * 60 * 1_000

export type SyncRequest = (path: string, options?: RequestOptions) => Promise<unknown>

export interface SyncEngineDeps {
  store: SyncStore & ConflictStore
  state: SyncStateStore
  /** Der Weg zur BFF. Im Test durch eine Attrappe ersetzbar. */
  request?: SyncRequest
  /**
   * Der Fingerabdruck der lokalen Daten, vergleichbar mit `contentHashV2` aus
   * `GET /sync/status`.
   *
   * Lange nicht vorhanden, weil der Server MD5 rechnet und `crypto.subtle`
   * genau das nicht kennt. Seit `app/sync/merge/md5.ts` gibt es die
   * Implementierung, geprüft gegen RFC 1321 UND gegen die echte
   * Postgres-Instanz. Bleibt die Funktion weg, fällt der Ablauf auf das alte
   * Verhalten zurück: im Zweifel den Nutzer fragen statt fremde Daten
   * zusammenzuwerfen.
   */
  computeLocalContentHashes?: () => Promise<ContentHashes | null>
  onNotice?: NoticeSink
  onMoreWork?: () => void
  integrity?: {
    resetCursor: () => Promise<void>
    marker: () => Promise<{ hash: string | null, at: number }>
    attempt: (at: number) => Promise<void>
    success: (hash: string, at: number) => Promise<void>
  }
  work?: { read: () => Promise<number>, complete: (generation: number, accountId: string) => Promise<void> }
}

export type SyncOutcome
  = | { ran: false, reason: 'busy' }
    | { ran: true, snapshot: SyncSnapshot }

/** Wie ein Lauf angestoßen wurde. */
export interface SyncRunOptions {
  /**
   * Geht der Lauf auf eine ausdrückliche Handlung des Nutzers zurück?
   *
   * Dann stellt er sich an der Tab-Sperre AN, statt aufzugeben. Ein
   * Tastendruck, der verpufft, weil ein anderer Tab gerade arbeitet, sieht aus
   * wie eine kaputte App. Zeitgeber und Ereignisse kommen dagegen von selbst
   * wieder und sollen sich nicht aufstauen.
   */
  userInitiated?: boolean
}

/**
 * Wie ein Konflikt aufgelöst wird, wenn beide Seiten Daten haben.
 *
 * Die drei Wege entsprechen denen der Android-App (ConflictStrategy), damit
 * dieselbe Entscheidung auf beiden Clients dasselbe bedeutet:
 *
 * - `merge`      — beide Bestände behalten. Lokale Löschabsichten werden
 *                  vorher verworfen, sonst rissen sie über das feldgenaue
 *                  Last-Write-Wins den Serverbestand mit.
 * - `pushLocal`  — der lokale Bestand gilt und wird hochgeladen.
 * - `pullServer` — der Server gilt; dieses Gerät vergisst seinen Bestand.
 */
export type ConflictStrategy = 'merge' | 'pushLocal' | 'pullServer'

export interface SyncEngine {
  sync: (options?: SyncRunOptions) => Promise<SyncOutcome>
  /**
   * Löst einen gemeldeten Konflikt auf und gleicht anschließend ab.
   *
   * Nur nach einer Entscheidung des Nutzers aufrufen: `pullServer` verwirft
   * lokale Daten unwiederbringlich, `pushLocal` schreibt sie über den
   * Serverbestand.
   */
  resolveConflict: (strategy: ConflictStrategy) => Promise<SyncOutcome>
  isRunning: () => boolean
}

/**
 * Was nach dem ersten Blick auf den Server zu tun ist.
 *
 * `'stop'` heißt: Es steht eine Entscheidung des Nutzers aus, es wird nichts
 * gezogen und nichts geschrieben.
 */
interface FirstSyncDecision {
  next: 'push' | 'pullOnly' | 'done' | 'stop'
  /** Zeilen, die der Import verworfen hat. */
  notSyncedCount: number
}

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const { store, state, request = requestJson, computeLocalContentHashes, onNotice } = deps

  let running = false
  let repairedThisRun = false
  let cycleAccountId: string | null = null
  let cyclePhase: SyncPhase | undefined
  let confirmedAt: IsoUtc | null = null

  /** Hat ein Mensch diesen Lauf angestossen? Dann wird nicht gespart. */
  let cycleUserInitiated = false

  /** Wann zuletzt die Integrität geprüft wurde. `0` heisst "noch nie". */
  let lastIntegrityCheckAt = 0

  /** Schickt einen Push-Block. */
  const sendPush = (payload: PushPayload): Promise<unknown> =>
    request(SYNC_ENDPOINTS.push, { method: 'POST', body: payload })

  const sendMigrate = (payload: PushPayload): Promise<unknown> =>
    request(SYNC_ENDPOINTS.migrate, { method: 'POST', body: payload })

  const fetchPull = (since: IsoUtc | null, pageToken?: string): Promise<unknown> => {
    const params = new URLSearchParams()
    if (since !== null) params.set('since', since)
    // Setzt eine gekappte Antwort fort. Ohne ihn beginnt der Server von vorn —
    // und genau das war der Stillstand, den die Blätterung aufhebt.
    if (pageToken !== undefined) params.set('pageToken', pageToken)
    const query = params.toString()
    return request(query === '' ? SYNC_ENDPOINTS.pull : `${SYNC_ENDPOINTS.pull}?${query}`)
  }

  /**
   * Pusht und schluckt dabei jeden Fehler.
   *
   * DER PULL DARF AM PUSH NICHT SCHEITERN: Ein abgelehnter Push lässt die
   * lokalen Zeilen schmutzig — sie sind nicht verloren. Der Pull dagegen
   * bringt die Änderungen der anderen Geräte, und die fehlten sonst, obwohl
   * mit ihnen alles in Ordnung ist. Der Fehler geht als Rückgabewert weiter
   * und bestimmt am Ende die gemeldete Phase; verschluckt wird er nicht.
   */
  const pushTolerantly = async (): Promise<{ outcome: PushOutcome | null, error: SyncError | null }> => {
    try {
      return { outcome: await runPush(store, sendPush, onNotice), error: null }
    }
    catch (cause) {
      return { outcome: null, error: toSyncError(cause) }
    }
  }

  /**
   * Beide Seiten haben Daten — dürfen sie ohne Rückfrage zusammengeführt werden?
   *
   * Ja, wenn die Stände nachweislich identisch sind (Content-Hash) oder wenn
   * sich derselbe Nutzer erneut anmeldet: Dann gehören die lokalen Daten
   * ohnehin zu diesem Konto. In allen anderen Fällen entscheidet der Nutzer.
   */
  const mayMergeWithoutAsking = async (status: ServerStatus, session: SessionState): Promise<boolean> => {
    if (status.contentHashV2 !== null && computeLocalContentHashes !== undefined) {
      const lokal = await computeLocalContentHashes()
      if (lokal !== null && lokal.v2 === status.contentHashV2) return true
    }

    const lastSignedInUserId = await store.readLastSignedInUserId()
    return lastSignedInUserId !== null && session.userId !== null && lastSignedInUserId === session.userId
  }

  /** Der erste Abgleich dieses Geräts mit diesem Konto. */
  const runFirstSync = async (session: SessionState): Promise<FirstSyncDecision> => {
    const status = parseServerStatus(await request(SYNC_ENDPOINTS.status))
    const local = await store.countLocalData()
    const hasLocalData = local.lists > 0 || local.recipes > 0

    if (status.isEmpty && hasLocalData) {
      // Der Import ist der erste Kontakt: Danach ist alles Lokale auch auf dem
      // Server, ein Pull würde nur die eigenen Zeilen zurückholen. Das
      // Wasserzeichen bleibt deshalb ungesetzt, der nächste Lauf zieht voll.
      const migrated = await runMigrate(store, sendMigrate, onNotice)
      await store.writeHasMigrated(true)
      return { next: 'done', notSyncedCount: migrated.skippedCount }
    }

    if (!status.isEmpty && hasLocalData) {
      if (!await mayMergeWithoutAsking(status, session)) {
        state.set({
          phase: 'error',
          message: 'Auf dem Server liegen bereits Daten. Bitte entscheide, welcher Stand gilt.',
          conflict: toConflictReport(status, local.lists, local.recipes),
        })
        return { next: 'stop', notSyncedCount: 0 }
      }

      await store.writeHasMigrated(true)
      return { next: 'push', notSyncedCount: 0 }
    }

    // Entweder ist auch lokal nichts da, oder nur der Server hat Daten. In
    // beiden Fällen gibt es nichts hochzuladen.
    await store.writeHasMigrated(true)
    return { next: 'pullOnly', notSyncedCount: 0 }
  }

  const runCycle = async (): Promise<void> => {
    cyclePhase = undefined
    confirmedAt = null
    cycleAccountId = null
    const session = parseSessionState(await request(SYNC_ENDPOINTS.session))
    cycleAccountId = session.userId
    if (!session.authenticated) {
      state.set({
        phase: 'authRequired',
        message: 'Die Anmeldung ist abgelaufen. Bitte melde dich erneut an.',
        conflict: null,
      })
      return
    }

    /*
     * GEHÖRT DER BESTAND HIER ÜBERHAUPT DIESEM KONTO?
     *
     * Diese Frage MUSS vor `readHasMigrated()` stehen. `hasMigrated` ist eine
     * Aussage über das GERÄT ("hier lief schon einmal ein Erstabgleich") und
     * wird nie zurückgesetzt. Sobald es einmal `true` war, sprang jeder Lauf
     * direkt in Push und Pull — der Erstabgleich mit seiner Besitzfrage war
     * unerreichbar, und ein Kontowechsel fiel deshalb niemandem auf.
     *
     * Was daraus folgte, in aufsteigender Bosheit: Das neue Konto sah die
     * Listen des alten in der Übersicht. Fasste es eine an, lehnte der Server
     * sie ab, und die Anzeige meldete dauerhaft ungesendete Zeilen, die kein
     * Bedienschritt auflöste. Und das Wasserzeichen des alten Kontos blieb
     * stehen, weshalb der erste Abruf des neuen INKREMENTELL ab diesem fremden
     * Stand lief: Alles Ältere kam nie an, und die Selbstheilung, die das
     * auffangen würde, ist genau dann gesperrt, wenn lokal etwas offen ist.
     *
     * Beide Werte müssen gesetzt sein. Eine fehlende Marke heisst "noch nie
     * abgeglichen" und ist kein Wechsel — auf einem Bestandsgerät steht sie
     * beim ersten Lauf nach diesem Umbau leer, und dann soll alles bleiben,
     * wie es ist. Der Lauf schreibt sie am Ende, ab dann greift die Prüfung.
     */
    const bisherigerBesitzer = await store.readLastSignedInUserId()
    if (bisherigerBesitzer !== null && session.userId !== null && bisherigerBesitzer !== session.userId) {
      onNotice?.('Auf diesem Gerät lagen Daten eines anderen Kontos. Der Abgleich beginnt von vorn.')
      await store.forgetPreviousAccount()
    }

    let push: { outcome: PushOutcome | null, error: SyncError | null } = { outcome: null, error: null }

    if (await store.readHasMigrated()) {
      push = await pushTolerantly()
    }
    else {
      const decision = await runFirstSync(session)
      if (decision.next === 'stop') return
      if (decision.next === 'done') {
        await finish(null, decision.notSyncedCount, null)
        return
      }
      if (decision.next === 'push') push = await pushTolerantly()
    }

    const pull = await runPull(store, fetchPull)
    await finish(pull, push.outcome?.skippedCount ?? 0, push.error)
  }

  /**
   * Setzt den Zustand nach einem durchgelaufenen Zyklus.
   *
   * Ein gescheiterter Push wird gemeldet, obwohl der Pull geklappt hat: "alles
   * gut" wäre falsch, solange lokale Änderungen ungesendet sind.
   */
  const finish = async (
    pull: PullOutcome | null,
    notSyncedCount: number,
    pushError: SyncError | null,
    /**
     * Prüfen, egal wie kurz die letzte Prüfung her ist.
     *
     * Gesetzt vom Heilungslauf unten: Der zieht alles neu und ruft `finish`
     * ein zweites Mal — und genau dieser Durchgang MUSS vergleichen, sonst
     * bliebe die Heilung unbestätigt und liefe beim nächsten Anlass erneut.
     */
    erzwingePruefung = false,
  ): Promise<void> => {
    let pendingCount = await store.countPending()
    let verificationMessage: string | null = null
    /*
     * LOHNT DIE PRÜFUNG ÜBERHAUPT GERADE?
     *
     * Sie ist der mit Abstand teuerste Vorgang im Ruhezustand: Der Server baut
     * dafür sechs `md5(string_agg(...))` über den GESAMTEN Bestand des Kontos,
     * und dieses Gerät liest sechs IndexedDB-Stores vollständig aus, sortiert
     * sie und hasht sie — im Hauptthread, ohne Worker. Auf einem Konto mit
     * 24.000 Einträgen ist das beidseitig spürbar.
     *
     * Bisher lief sie nach JEDEM Abgleich, also alle 15 Minuten, auch wenn
     * nichts passiert war. Das Missverhältnis ist der Punkt: Die Heilung, die
     * sie füttert, darf ohnehin höchstens einmal je 12 Stunden zuschlagen
     * (`MIN_HEAL_INTERVAL_MS`). Gemessen wurde 96-mal am Tag, gehandelt
     * höchstens zweimal. Und der Herzschlag hat über die Änderungsnummer
     * fünfzehn Sekunden vorher schon gesagt, dass sich nichts geändert hat.
     *
     * DIE ZUSAGE BLEIBT UNVERÄNDERT: Die Prüfung ist das Netz gegen eine ALTE
     * Abweichung, an der der Cursor längst vorbei ist. Ein Netz, das stündlich
     * gespannt wird, fängt dasselbe wie eines, das viertelstündlich gespannt
     * wird — die Heilung dahinter kann gar nicht öfter greifen.
     *
     * Drei Anlässe lassen sie laufen: Es kam etwas herunter, ein Mensch hat den
     * Lauf angestossen, oder die letzte Prüfung ist über eine Stunde her.
     */
    const kamEtwasAn = pull !== null
      && (pull.lists + pull.recipes + pull.badges + pull.revokedLists) > 0
    const lohntPruefung = erzwingePruefung
      || kamEtwasAn
      || cycleUserInitiated
      || Date.now() - lastIntegrityCheckAt >= INTEGRITY_MIN_INTERVAL_MS

    if (lohntPruefung && pushError === null && pendingCount === 0 && !pull?.truncated
      && (pull === null || pull.cursorAdvanced) && deps.integrity && computeLocalContentHashes) {
      lastIntegrityCheckAt = Date.now()
      const status = parseServerStatus(await request(SYNC_ENDPOINTS.status))
      const local = await computeLocalContentHashes()
      pendingCount = await store.countPending()
      const marker = await deps.integrity.marker()
      const verdict = evaluateIntegrity({ serverHash: status.contentHashV2, localHash: local?.v2 ?? null,
        pendingChanges: pendingCount, lastHealedHash: marker.hash, lastHealedAt: marker.at, now: Date.now() })
      if (verdict.kind === 'heal' && !repairedThisRun) {
        repairedThisRun = true
        await deps.integrity.attempt(Date.now())
        // Unter derselben Web-Sperre. Vollabruf führt zusammen und löscht keine lokalen Daten.
        await deps.integrity.resetCursor()
        await finish(await runPull(store, fetchPull), notSyncedCount, null, true)
        return
      }
      if (verdict.kind === 'in-sync' && repairedThisRun && status.contentHashV2 !== null) {
        await deps.integrity.success(status.contentHashV2, Date.now())
      }
      if (verdict.kind !== 'in-sync' && verdict.kind !== 'pending') {
        verificationMessage = verdict.kind === 'unknown'
          ? 'Der aktuelle Stand konnte noch nicht bestätigt werden.'
          : 'Die Stände unterscheiden sich noch. Deine lokalen Änderungen bleiben erhalten.'
      }
    }
    const pullIncomplete = pull !== null && (pull.truncated || !pull.cursorAdvanced)

    const phase: SyncPhase = pushError !== null
      ? phaseFromError(pushError)
      : pendingCount > 0 || notSyncedCount > 0 || pullIncomplete || verificationMessage !== null ? 'pending' : 'idle'

    cyclePhase = phase
    confirmedAt = phase === 'idle' && pull?.cursorAdvanced === true ? pull.serverTime : null
    state.set({
      phase: phase === 'idle' ? 'syncing' : phase,
      message: pushError !== null
        ? describeSyncError(pushError)
        : verificationMessage ?? (pullIncomplete ? 'Der Abgleich ist noch nicht vollständig. Weitere Änderungen werden geladen.' : null),
      retryAfterMs: pushError?.retryAfterMs ?? null,
      pendingCount,
      notSyncedCount,
      conflict: null,
      // Nur aus einem gelaufenen Pull übernehmen: Ein Lauf, der gar nicht
      // gezogen hat, weiß nichts über Einladungen und dürfte die zuletzt
      // bekannten nicht wegwerfen.
      ...(pull === null ? {} : { pendingInvites: pull.pendingInvites }),
    })
  }

  const sync = async (options: SyncRunOptions = {}): Promise<SyncOutcome> => {
    let lastStartedGeneration: number | undefined
    // Die Prüfung und das Setzen liegen im selben synchronen Abschnitt — ohne
    // ein `await` dazwischen kann kein zweiter Aufruf hineinrutschen.
    if (running) return { ran: false, reason: 'busy' }
    running = true
    repairedThisRun = false
    cyclePhase = undefined
    cycleUserInitiated = options.userInitiated === true
    confirmedAt = null

    /*
     * Der Mutex oben deckt nur DIESEN Tab ab: Er ist eine Variable im
     * Arbeitsspeicher. Zwei offene Tabs hatten bisher zwei Schleifen, zwei
     * Mutexe und dieselbe IndexedDB darunter — sie konnten gleichzeitig ziehen,
     * zusammenführen und schreiben. Die Sperre in ./leader.ts zieht die Grenze
     * über alle Tabs hinweg.
     *
     * Ist sie belegt, kehrt der Aufruf sofort zurück — außer der Lauf geht auf
     * eine ausdrückliche Handlung des Nutzers zurück, dann stellt er sich an.
     * Ein Tastendruck, der still verpufft, weil ein anderer Tab arbeitet, sieht
     * aus wie eine kaputte App.
     */
    try {
      const ergebnis = await runAsLeader(async () => {
        state.set({ phase: 'syncing', message: null, retryAfterMs: null })

        try {
          // Begrenzter Drain: Fehler bleiben dauerhaft offen und erzeugen keine Netzschleife.
          for (let cycle = 0; cycle < 8; cycle += 1) {
            const generation = await deps.work?.read()
            lastStartedGeneration = generation
            await runCycle()
            const phase = cyclePhase ?? state.get().phase
            if (phase !== 'idle' && phase !== 'pending') break

            /*
             * DER LAUF IST DURCH — ab jetzt ist bewiesen, dass der Bestand auf
             * diesem Gerät zu diesem Konto gehört. Genau das hält die Marke
             * fest, und genau deshalb steht sie HIER und nicht beim Anmelden:
             * Vorher wäre sie eine Behauptung, und sie würde die Besitzfrage
             * beantworten, bevor der Erstabgleich sie überhaupt stellen konnte.
             *
             * `pending` zählt als durch: Ungesendete Zeilen sagen etwas über
             * den Fortschritt, nicht über den Besitz.
             *
             * Beim Abmelden zu schreiben — wie Android es bis heute tat —
             * reicht nicht: Läuft die Sitzung ab, gibt es kein Abmelden, in dem
             * jemand etwas hätte hinterlegen können. Genau der Fall ist der
             * häufigste.
             */
            if (cycleAccountId !== null) await store.writeLastSignedInUserId(cycleAccountId)
            if (generation !== undefined && phase === 'idle') {
              const currentSession = parseSessionState(await request(SYNC_ENDPOINTS.session))
              if (!currentSession.authenticated || cycleAccountId === null || currentSession.userId !== cycleAccountId) {
                state.set({ phase: 'error', message: 'Die Anmeldung hat sich während des Abgleichs geändert. Der Abschluss wurde nicht bestätigt.' })
                break
              }
              await deps.work?.complete(generation, cycleAccountId)
            }
            const next = await deps.work?.read()
            if (generation === undefined || next === generation) break
            state.set({ phase: 'pending', message: 'Neue Änderungen warten auf den nächsten Abgleich.' })
          }
        }
        catch (cause) {
          const error = toSyncError(cause)
          state.set({
            phase: phaseFromError(error),
            message: describeSyncError(error),
            retryAfterMs: error.retryAfterMs,
            pendingCount: await countPendingQuietly(store),
          })
        }
      }, { mode: options.userInitiated === true ? 'waitForTurn' : 'skipIfBusy' })

      if (!ergebnis.ran) return { ran: false, reason: 'busy' }

      // Abschlussbeobachtung nach Freigabe der Tab-Sperre.
      // Der lokale Mutex bleibt bis zum Abschluss bestehen. Ein verlorenes
      // Debounce-Signal im Abschlussfenster wird durch die dauerhafte Generation sichtbar.
      if (deps.work && lastStartedGeneration !== undefined
        && (state.get().phase === 'syncing' || state.get().phase === 'pending')) {
        try {
          if (await deps.work.read() > lastStartedGeneration) {
            state.set({ phase: 'pending', message: 'Neue lokale Arbeit wird weiter abgeglichen.' })
            deps.onMoreWork?.()
          }
        }
        catch {
          state.set({ phase: 'pending', message: 'Offene Arbeit wird beim nächsten Start erneut geprüft.' })
        }
      }
      if (state.get().phase === 'syncing' && cyclePhase === 'idle') {
        state.set({ phase: 'idle', ...(confirmedAt === null ? {} : { lastSyncedAt: confirmedAt }) })
      }
    }
    catch (cause) {
      /*
       * Die Sperre selbst kann werfen — `navigator.locks` ist in manchen
       * eingebetteten Kontexten gesperrt und wirft dann statt zu antworten.
       * Der `catch` im Rumpf greift dafür nicht: Der liegt INNERHALB des
       * Rückrufs, der in diesem Fall nie läuft. Ohne diesen hier verließe der
       * Fehler die Engine unbemerkt, der Zustand bliebe auf dem alten Wert
       * stehen und der Aufrufer bekäme eine unbehandelte Ablehnung.
       */
      const error = toSyncError(cause)
      state.set({
        phase: phaseFromError(error),
        message: describeSyncError(error),
        retryAfterMs: error.retryAfterMs,
        pendingCount: await countPendingQuietly(store),
      })
    }
    finally {
      running = false
    }

    return { ran: true, snapshot: state.get() }
  }

  /**
   * Führt die gewählte Auflösung aus und gleicht danach ab.
   *
   * UNTER DERSELBEN SPERRE WIE DER GEWÖHNLICHE LAUF, und das ist hier kein
   * Beiwerk: `pullServer` ruft `wipeLocalData()`. Liefe in einem anderen Tab
   * gleichzeitig ein Abgleich, träfe das Löschen mitten in dessen
   * Zusammenführen — teils gelöscht, teils frisch geschrieben, und der fremde
   * Lauf rückte danach seinen Cursor über den Schaden hinweg vor. Der Mutex
   * `running` deckt das nicht ab, er ist eine Variable genau eines Tabs.
   *
   * Und sie stellt sich AN statt aufzugeben: Die Auflösung ist die Antwort auf
   * eine Frage, die dem Nutzer gestellt wurde. Sie darf nicht verpuffen, nur
   * weil gerade woanders gearbeitet wird.
   */
  const resolveConflict = async (strategy: ConflictStrategy): Promise<SyncOutcome> => {
    if (running) return { ran: false, reason: 'busy' }
    running = true
    repairedThisRun = false
    cyclePhase = undefined
    // Ein Mensch steht hier direkt davor und hat gerade entschieden.
    cycleUserInitiated = true
    confirmedAt = null

    state.set({ phase: 'syncing', message: null, retryAfterMs: null, conflict: null })

    try {
      const ergebnis = await runAsLeader(
        () => resolveConflictUnterSperre(strategy),
        { mode: 'waitForTurn' },
      )
      if (!ergebnis.ran) return { ran: false, reason: 'busy' }
    }
    catch (cause) {
      // Dasselbe wie oben: Wirft die Sperre selbst, liegt das außerhalb des
      // Rückrufs und damit außerhalb seines eigenen `catch`.
      const error = toSyncError(cause)
      state.set({
        phase: phaseFromError(error),
        message: describeSyncError(error),
        retryAfterMs: error.retryAfterMs,
        pendingCount: await countPendingQuietly(store),
      })
    }
    finally {
      running = false
    }

    if (state.get().phase === 'syncing' && cyclePhase === 'idle') {
      state.set({ phase: 'idle', ...(confirmedAt === null ? {} : { lastSyncedAt: confirmedAt }) })
    }
    return { ran: true, snapshot: state.get() }
  }

  /** Der eigentliche Ablauf — läuft ausschließlich unter der Sperre. */
  const resolveConflictUnterSperre = async (strategy: ConflictStrategy): Promise<void> => {
    try {
      // Der Marker wird in jedem der drei Wege gesetzt: Die Frage ist
      // beantwortet und darf beim nächsten Start nicht erneut gestellt werden.
      if (strategy === 'merge') {
        await store.clearDirtyOnDeleted()
        await store.writeHasMigrated(true)
      }
      else if (strategy === 'pullServer') {
        await store.wipeLocalData()
        await store.writeHasMigrated(true)
      }
      else {
        // pushLocal: der Import lädt den lokalen Bestand hoch. Danach ist
        // alles Lokale auch auf dem Server, der Pull darunter holt die
        // Serversicht zurück.
        const migrated = await runMigrate(store, sendMigrate, onNotice)
        await store.writeHasMigrated(true)
        await finish(null, migrated.skippedCount, null)
        return
      }

      const pull = await runPull(store, fetchPull)
      await finish(pull, 0, null)
    }
    catch (cause) {
      const error = toSyncError(cause)
      state.set({
        phase: phaseFromError(error),
        message: describeSyncError(error),
        retryAfterMs: error.retryAfterMs,
        pendingCount: await countPendingQuietly(store),
      })
    }
  }

  return { sync, resolveConflict, isRunning: () => running }
}

function toConflictReport(status: ServerStatus, localLists: number, localRecipes: number): SyncConflictReport {
  return {
    server: {
      lists: status.lists,
      recipes: status.recipes,
      contentHash: status.contentHash,
      lastOverwriteAt: status.lastOverwriteAt,
    },
    local: { lists: localLists, recipes: localRecipes },
  }
}

/**
 * Der Zähler für die Statusanzeige darf einen Fehlerpfad nicht überschreiben.
 * Scheitert er selbst (Datenbank weg), bleibt es bei null — die Fehlermeldung
 * ist die wichtigere Nachricht.
 */
async function countPendingQuietly(store: SyncStore): Promise<number> {
  try {
    return await store.countPending()
  }
  catch {
    return 0
  }
}

/**
 * Die Engine dieser App.
 *
 * Ein Abgleich betrifft das ganze Gerät, deshalb genau eine Instanz — zwei
 * hätten je einen eigenen Mutex und liefen sich gegenseitig in die Quere.
 */
/**
 * Der Fingerabdruck des lokalen Bestands.
 *
 * Wird nur beim allerersten Abgleich gebraucht — und dort entscheidet er
 * darüber, ob der Nutzer eine Rückfrage sieht oder nicht: Sind beide Seiten
 * nachweislich identisch, gibt es nichts zu entscheiden.
 */
async function computeLocalContentHashes(): Promise<ContentHashes | null> {
  try {
    return computeContentHashes(await getAllForContentHash())
  }
  catch {
    // Ohne Fingerabdruck bleibt der sichere Weg: im Zweifel fragen.
    return null
  }
}

export const syncEngine: SyncEngine = createSyncEngine({
  store: localStore,
  state: syncState,
  onMoreWork: () => {
    setTimeout(() => {
      void syncEngine.sync().catch(() => {
        syncState.set({ phase: 'pending', message: 'Der Abgleich wird beim nächsten Start fortgesetzt.' })
      })
    }, 0)
  },
  computeLocalContentHashes,
  work: { read: getWorkGeneration, complete: completeWorkGeneration },
  integrity: { resetCursor: () => setLastSyncedAt(null), marker: getSelfHealMarker, attempt: setSelfHealAttempt, success: setSelfHealSuccess },
})
