import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useMinimumVisible } from './useMinimumVisible'

const warte = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe('useMinimumVisible', () => {
  test('ein kurzer Zustand bleibt die Mindestzeit sichtbar', async () => {
    const scope = effectScope()
    const quelle = ref(false)
    const sichtbar = scope.run(() => useMinimumVisible(quelle, 60))

    quelle.value = true
    await nextTick()
    expect(sichtbar?.value).toBe(true)

    quelle.value = false
    await nextTick()
    expect(sichtbar?.value).toBe(true)

    await warte(90)
    expect(sichtbar?.value).toBe(false)
    scope.stop()
  })

  test('ein langer Zustand endet sofort mit der Quelle', async () => {
    const scope = effectScope()
    const quelle = ref(true)
    const sichtbar = scope.run(() => useMinimumVisible(quelle, 20))

    await warte(40)
    quelle.value = false
    await nextTick()
    expect(sichtbar?.value).toBe(false)
    scope.stop()
  })

  test('kommt der Zustand zurück, bevor die Mindestzeit um ist, bleibt er sichtbar', async () => {
    const scope = effectScope()
    const quelle = ref(true)
    const sichtbar = scope.run(() => useMinimumVisible(quelle, 40))

    quelle.value = false
    await nextTick()
    quelle.value = true
    await nextTick()
    await warte(60)
    expect(sichtbar?.value).toBe(true)
    scope.stop()
  })
})
