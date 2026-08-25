/// <reference types="bun" />
/**
 * Die unteilbaren Schreibwege des Repositorys: `mutateRow` und
 * `advanceLastChangeSeq`.
 *
 * Beide haben dieselbe Eigenschaft und denselben Grund: Lesen, Vergleichen und
 * Schreiben passieren in EINER Transaktion. Liegt dazwischen ein `await`,
 * entscheidet der Vergleich gegen einen Stand, den in der Zwischenzeit jemand
 * anderes überholt haben kann.
 *
 * WOGEGEN DAS STEHT
 *
 * Der Abgleich las bisher eine Zeile über einen Aufruf und schrieb sie über
 * einen zweiten zurück. Dazwischen liegt mindestens ein `await`, und in diesem
 * Fenster kann die Oberfläche oder ein zweiter Tab eine neuere lokale Änderung
 * schreiben. Der Schreibvorgang des Abgleichs beruht dann auf dem ALTEN Stand
 * und überschreibt sie — samt `dirty`-Flag. Die Eingabe ist damit nicht nur
 * weg, sie wird auch nie hochgeladen, und nichts davon erzeugt einen Fehler.
 *
 * Die Isolation selbst liefert IndexedDB, sobald beides in derselben
 * Transaktion läuft. Was hier geprüft wird, ist die Voraussetzung dafür: dass
 * es wirklich EINE Transaktion ist und dass das Zusammenführen dazwischen
 * passiert, statt vorher oder nachher.
 *
 * Gearbeitet wird mit ECHTEN Zeilen (`ListRow`), nicht mit einem
 * Platzhaltertyp. Ein Platzhalter bräuchte an jeder Übergabe einen Cast, und
 * ein Cast prüft genau das nicht mehr, worum es hier geht: dass die Signatur
 * von `mutateRow` den Stand der Tabelle liefert, in die geschrieben wird.
 */
import { describe, expect, mock, test } from 'bun:test'
import type { ListRow } from './schema'

const EARLIER = '2026-08-19T09:00:00.000Z'

/** Eine vollständige Listenzeile, wahlweise abgewandelt. */
function liste(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: 'a',
    name: 'Wocheneinkauf',
    color: '#AABBCC',
    secret: false,
    lastSuggestedItems: '',
    sourceUrl: null,
    ownerUserId: null,
    deletedAt: null,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    fieldTimestamps: { name: EARLIER },
    dirty: 0,
    ...overrides,
  }
}

/** Was innerhalb einer Transaktion tatsächlich passiert ist, in Reihenfolge. */
const transaktionen: string[][] = []
/** Der "Datenbestand" — vom Test direkt manipulierbar. */
const daten = new Map<string, ListRow | number>()

/** Narrowing statt Cast: Zeilentabellen halten Objekte, `sync_meta` Zahlen. */
function alsListe(wert: ListRow | number | undefined): ListRow | undefined {
  return typeof wert === 'object' ? wert : undefined
}

function fakeDb() {
  return {
    transaction(name: string, mode: string) {
      const ablauf: string[] = [`open:${name}:${mode}`]
      transaktionen.push(ablauf)
      return {
        objectStore: () => ({
          get: (id: string) => {
            ablauf.push(`get:${id}`)
            return Promise.resolve(daten.get(id))
          },
          /*
           * Zwei Aufrufformen, wie bei `idb`: Ein Store mit `keyPath` (die
           * Zeilentabellen) bekommt nur den Wert, ein Key-Value-Store
           * (`sync_meta`) Wert und Schlüssel getrennt.
           */
          put: (value: ListRow | number, key?: string) => {
            const id = key ?? alsListe(value)?.id
            if (id === undefined) throw new Error('put ohne Schlüssel')
            ablauf.push(`put:${id}`)
            daten.set(id, value)
            return Promise.resolve(id)
          },
        }),
        done: Promise.resolve(),
      }
    },
  }
}

mock.module('./client', () => ({ getDb: () => Promise.resolve(fakeDb()) }))

const { advanceLastChangeSeq, mutateRow } = await import('./repositories')

function reset(): void {
  transaktionen.length = 0
  daten.clear()
}

describe('mutateRow', () => {
  test('öffnet GENAU EINE Transaktion und liest darin vor dem Schreiben', async () => {
    // Der Kern. Zwei Transaktionen wären zwei Zeitpunkte, und dazwischen läge
    // wieder das Fenster, das dieser Umbau schliessen soll.
    reset()
    daten.set('a', liste({ name: 'alt' }))

    await mutateRow('lists', 'a', () => liste({ name: 'neu' }))

    expect(transaktionen).toHaveLength(1)
    expect(transaktionen[0]).toEqual(['open:lists:readwrite', 'get:a', 'put:a'])
  })

  test('das Zusammenführen sieht den Stand aus DIESER Transaktion', async () => {
    // Nicht einen vorher gelesenen Schnappschuss: Genau der wäre veraltet,
    // sobald zwischendurch jemand geschrieben hat.
    reset()
    daten.set('a', liste({ name: 'gerade getippt' }))

    let gesehen: ListRow | undefined
    await mutateRow('lists', 'a', (local) => {
      gesehen = local
      return null
    })

    expect(gesehen?.name).toBe('gerade getippt')
  })

  test('eine fehlende Zeile kommt als undefined an, nicht als Fehler', async () => {
    reset()

    let aufgerufen = false
    let gesehen: ListRow | undefined
    await mutateRow('lists', 'gibt-es-nicht', (local) => {
      aufgerufen = true
      gesehen = local
      return null
    })

    expect(aufgerufen).toBe(true)
    expect(gesehen).toBeUndefined()
  })

  test('null schreibt nichts', async () => {
    // Der Weg für Zeilen, die nichts Neues bringen — etwa eine bereits
    // vorhandene Chat-Nachricht. Ein Schreibvorgang würde dort nur das
    // Dirty-Flag einer noch nicht gepushten Nachricht löschen.
    reset()
    daten.set('a', liste({ name: 'unberührt' }))

    await mutateRow('lists', 'a', () => null)

    expect(transaktionen[0]).toEqual(['open:lists:readwrite', 'get:a'])
    expect(alsListe(daten.get('a'))?.name).toBe('unberührt')
  })

  test('das Schreiben passiert im selben synchronen Zug wie das Zusammenführen', async () => {
    /*
     * DIE REGEL, AN DER DIESER UMBAU SONST SCHEITERT: Eine
     * IndexedDB-Transaktion committet automatisch, sobald die Microtask-Queue
     * leerläuft. Läge zwischen Zusammenführen und Schreiben auch nur eine
     * Microtask, wäre sie im Browser bereits geschlossen und der Schreibvorgang
     * stürbe mit `TransactionInactiveError`.
     *
     * Der Test hängt eine Microtask an und prüft, dass das `put` VORHER
     * passiert ist. Mit einem `await` im Rumpf wäre die Reihenfolge umgekehrt.
     */
    reset()
    daten.set('a', liste({ name: 'alt' }))

    let microtaskGelaufen = false
    let putVorMicrotask: boolean | null = null

    await mutateRow('lists', 'a', () => {
      queueMicrotask(() => {
        microtaskGelaufen = true
        putVorMicrotask = transaktionen[0]?.includes('put:a') ?? false
      })
      return liste({ name: 'neu' })
    })

    // Auf die Microtask warten, ohne sie vorwegzunehmen.
    await Promise.resolve()
    expect(microtaskGelaufen).toBe(true)
    expect(putVorMicrotask).toBe(true)
  })

  test('trifft die richtige Tabelle', async () => {
    reset()
    await mutateRow('list_items', 'x', () => null)
    expect(transaktionen[0]?.[0]).toBe('open:list_items:readwrite')
  })
})

describe('advanceLastChangeSeq', () => {
  test('vergleicht und schreibt in EINER Transaktion', async () => {
    /*
     * Der Vergleich lag vorher im Aufrufer (`handleEvents`), mit einem `await`
     * zwischen Lesen und Schreiben. In dieses Fenster konnte ein gleichzeitig
     * laufender Abgleich schreiben — der Vergleich entschied dann gegen einen
     * Stand, den es schon nicht mehr gab.
     */
    reset()
    daten.set('lastChangeSeq', 5)

    await advanceLastChangeSeq(9)

    expect(transaktionen).toHaveLength(1)
    expect(transaktionen[0]).toEqual(['open:sync_meta:readwrite', 'get:lastChangeSeq', 'put:lastChangeSeq'])
    expect(daten.get('lastChangeSeq')).toBe(9)
  })

  test('geht nur vorwärts', async () => {
    // Die Zustellung der Ereignisse ist nicht geordnet. Ein überholtes
    // Ereignis würde den Stand zurückdrehen und dem nächsten Herzschlag eine
    // Lücke vortäuschen, die keine ist.
    reset()
    daten.set('lastChangeSeq', 9)

    await advanceLastChangeSeq(3)

    expect(transaktionen[0]).toEqual(['open:sync_meta:readwrite', 'get:lastChangeSeq'])
    expect(daten.get('lastChangeSeq')).toBe(9)
  })

  test('ein unbekannter Stand wird gesetzt', async () => {
    reset()

    await advanceLastChangeSeq(2)

    expect(daten.get('lastChangeSeq')).toBe(2)
  })

  test('ein unbrauchbarer gespeicherter Wert gilt als unbekannt', async () => {
    // IndexedDB ist zur Laufzeit untypisiert: Eine ältere Fassung der App oder
    // ein Eingriff von Hand kann dort alles hineingeschrieben haben. Diesen
    // Wert als Zahl zu behandeln hiesse, mit ihm zu vergleichen.
    reset()
    daten.set('lastChangeSeq', Number.NaN)

    await advanceLastChangeSeq(4)

    expect(daten.get('lastChangeSeq')).toBe(4)
  })
})
