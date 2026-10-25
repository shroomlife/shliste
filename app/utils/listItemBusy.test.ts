import { describe, expect, test } from 'bun:test'
import { isItemBusy } from './listItemBusy'

describe('isItemBusy', () => {
  test('folgt allein dem Server-Spiegel linkPending', () => {
    expect(isItemBusy({ linkPending: true })).toBe(true)
    expect(isItemBusy({ linkPending: false })).toBe(false)
  })
})
