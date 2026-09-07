/// <reference types="bun" />
/**
 * Tests der Cross-Tab-Sperre.
 *
 * WOGEGEN DAS STEHT
 *
 * Der Mutex in `sync.ts` ist eine Variable im Arbeitsspeicher — er deckt genau
 * EINEN Tab ab. Zwei offene Tabs hatten damit zwei Schleifen, zwei Mutexe und
 * dieselbe IndexedDB darunter: Sie konnten gleichzeitig ziehen,
 * zusammenführen und schreiben. Die Folgen sind unauffällig und teuer,
 * doppelte Arbeit im harmlosen und gegenseitig weggenommene Dirty-Flags im
 * schlechten Fall.
 */
import { describe, expect, test } from 'bun:test'
import { runAsLeader, SYNC_LOCK_NAME, type LockManagerLike } from './leader'

/**
 * Eine Web-Locks-Attrappe mit genau einem Platz.
 *
 * Bildet das nach, worauf es ankommt: `ifAvailable` reicht `null` durch, wenn
 * die Sperre belegt ist, statt den Aufrufer anzustellen.
 */
function fakeLocks(): LockManagerLike & { belegt: boolean, angefragt: string[] } {
  const manager = {
    belegt: false,
    angefragt: [] as string[],
    async request(
      name: string,
      _options: { mode: 'exclusive', ifAvailable?: true },
      callback: (lock: unknown | null) => Promise<void>,
    ): Promise<void> {
      manager.angefragt.push(name)
      if (manager.belegt) {
        await callback(null)
        return
      }
      manager.belegt = true
      try {
        await callback({ name })
      }
      finally {
        manager.belegt = false
      }
    },
  }
  return manager
}

describe('runAsLeader', () => {
  test('führt die Arbeit aus, wenn die Sperre frei ist', async () => {
    const locks = fakeLocks()
    const ergebnis = await runAsLeader(() => Promise.resolve('fertig'), { locks })

    expect(ergebnis).toEqual({ ran: true, value: 'fertig' })
    expect(locks.angefragt).toEqual([SYNC_LOCK_NAME])
  })

  test('tut NICHTS, wenn ein anderer Tab gerade abgleicht', async () => {
    // Der eigentliche Fall. Wichtig ist, dass die Arbeit ausbleibt UND der
    // Aufrufer das erfährt — sonst läse er den Erfolg eines fremden Laufs als
    // seinen eigenen.
    const locks = fakeLocks()
    locks.belegt = true

    let gelaufen = false
    const ergebnis = await runAsLeader(() => {
      gelaufen = true
      return Promise.resolve('fertig')
    }, { locks })

    expect(gelaufen).toBe(false)
    expect(ergebnis).toEqual({ ran: false })
  })

  test('stellt sich NICHT an', async () => {
    /*
     * Anstehen wäre hier falsch: Die Auslöser sind Zeitgeber, Ereignisse und
     * jeder Tastendruck. Eine Warteschlange davon würde sich beim Freiwerden
     * auf einmal entladen und denselben Lauf mehrfach fahren, obwohl der erste
     * bereits alles mitgenommen hat.
     */
    const locks = fakeLocks()
    locks.belegt = true

    const start = Date.now()
    await runAsLeader(() => Promise.resolve(null), { locks })

    expect(Date.now() - start).toBeLessThan(50)
  })

  test('gibt die Sperre auch dann frei, wenn die Arbeit scheitert', async () => {
    // Sonst bliebe die Sperre für die Lebensdauer des Tabs stehen und KEIN Tab
    // könnte mehr abgleichen — aus einem einzelnen Fehler würde ein
    // dauerhafter Stillstand.
    const locks = fakeLocks()

    await expect(
      runAsLeader(() => Promise.reject(new Error('Netz weg')), { locks }),
    ).rejects.toThrow('Netz weg')

    expect(locks.belegt).toBe(false)

    const danach = await runAsLeader(() => Promise.resolve('geht wieder'), { locks })
    expect(danach).toEqual({ ran: true, value: 'geht wieder' })
  })

  test('ohne Web Locks läuft die Arbeit einfach direkt', async () => {
    // Ein Browser ohne diese Fähigkeit soll nicht schlechter dastehen als vor
    // dem Umbau, sondern nur nicht besser. Ein Abbruch wäre eine
    // Verschlechterung für den, der ohnehin schon weniger hat.
    const ergebnis = await runAsLeader(() => Promise.resolve('trotzdem'), { locks: undefined })
    expect(ergebnis).toEqual({ ran: true, value: 'trotzdem' })
  })

  test('fragt exklusiv und ohne Anstehen an', async () => {
    // Die beiden Optionen sind die ganze Semantik. Ein `mode: "shared"` ließe
    // beide Tabs gleichzeitig durch, ein fehlendes `ifAvailable` stellte sie an.
    let optionen: unknown = null
    const locks: LockManagerLike = {
      request: async (_name, options, callback) => {
        optionen = options
        await callback({})
      },
    }

    await runAsLeader(() => Promise.resolve(null), { locks })
    expect(optionen).toEqual({ mode: 'exclusive', ifAvailable: true })
  })

  test('eine ausdrückliche Handlung stellt sich an statt zu verpuffen', async () => {
    /*
     * Der Unterschied ist genau das fehlende `ifAvailable`. Ein Tastendruck
     * ist eine Warteschlange von eins: Ihn fallenzulassen, weil ein anderer Tab
     * gerade arbeitet, sieht für den Nutzer aus wie eine kaputte App — der
     * Knopf tut sichtbar nichts.
     */
    let optionen: unknown = null
    const locks: LockManagerLike = {
      request: async (_name, options, callback) => {
        optionen = options
        await callback({})
      },
    }

    const ergebnis = await runAsLeader(() => Promise.resolve('dran'), { locks, mode: 'waitForTurn' })

    expect(optionen).toEqual({ mode: 'exclusive' })
    expect(ergebnis).toEqual({ ran: true, value: 'dran' })
  })
})
