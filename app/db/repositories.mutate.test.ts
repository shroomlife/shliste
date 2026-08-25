/// <reference types="bun" />
/**
 * Tests von `mutateRow` — Lesen, Zusammenführen und Schreiben in EINEM Zug.
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
 */
import { describe, expect, mock, test } from 'bun:test'

interface Zeile { id: string, wert: string }

/** Was innerhalb einer Transaktion tatsächlich passiert ist, in Reihenfolge. */
const transaktionen: string[][] = []
/** Der "Datenbestand" — vom Test direkt manipulierbar. */
const daten = new Map<string, Zeile>()

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
          put: (row: Zeile) => {
            ablauf.push(`put:${row.id}`)
            daten.set(row.id, row)
            return Promise.resolve(row.id)
          },
        }),
        done: Promise.resolve(),
      }
    },
  }
}

mock.module('./client', () => ({ getDb: () => Promise.resolve(fakeDb()) }))

const { mutateRow } = await import('./repositories')

function reset(): void {
  transaktionen.length = 0
  daten.clear()
}

describe('mutateRow', () => {
  test('öffnet GENAU EINE Transaktion und liest darin vor dem Schreiben', async () => {
    // Der Kern. Zwei Transaktionen wären zwei Zeitpunkte, und dazwischen läge
    // wieder das Fenster, das dieser Umbau schliessen soll.
    reset()
    daten.set('a', { id: 'a', wert: 'alt' })

    await mutateRow('lists', 'a', () => ({ id: 'a', wert: 'neu' } as never))

    expect(transaktionen).toHaveLength(1)
    expect(transaktionen[0]).toEqual(['open:lists:readwrite', 'get:a', 'put:a'])
  })

  test('das Zusammenführen sieht den Stand aus DIESER Transaktion', async () => {
    // Nicht einen vorher gelesenen Schnappschuss: Genau der wäre veraltet,
    // sobald zwischendurch jemand geschrieben hat.
    reset()
    daten.set('a', { id: 'a', wert: 'gerade getippt' })

    let gesehen: Zeile | undefined
    await mutateRow('lists', 'a', (local) => {
      gesehen = local as unknown as Zeile
      return null
    })

    expect(gesehen?.wert).toBe('gerade getippt')
  })

  test('eine fehlende Zeile kommt als undefined an, nicht als Fehler', async () => {
    reset()

    let gesehen: unknown = 'nicht aufgerufen'
    await mutateRow('lists', 'gibt-es-nicht', (local) => {
      gesehen = local
      return null
    })

    expect(gesehen).toBeUndefined()
  })

  test('null schreibt nichts', async () => {
    // Der Weg für Zeilen, die nichts Neues bringen — etwa eine bereits
    // vorhandene Chat-Nachricht. Ein Schreibvorgang würde dort nur das
    // Dirty-Flag einer noch nicht gepushten Nachricht löschen.
    reset()
    daten.set('a', { id: 'a', wert: 'unberührt' })

    await mutateRow('lists', 'a', () => null)

    expect(transaktionen[0]).toEqual(['open:lists:readwrite', 'get:a'])
    expect(daten.get('a')?.wert).toBe('unberührt')
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
    daten.set('a', { id: 'a', wert: 'alt' })

    let microtaskGelaufen = false
    let putVorMicrotask: boolean | null = null

    await mutateRow('lists', 'a', () => {
      queueMicrotask(() => {
        microtaskGelaufen = true
        putVorMicrotask = transaktionen[0]?.includes('put:a') ?? false
      })
      return { id: 'a', wert: 'neu' } as never
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
