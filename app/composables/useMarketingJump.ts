import { useEventListener } from '@vueuse/core'

/** Keep native fragment navigation (history, focus and :target), with a short travel time. */
export function useMarketingJump() {
  let frame = 0
  const cancel = () => cancelAnimationFrame(frame)
  useEventListener('wheel', cancel, { passive: true })
  useEventListener('touchstart', cancel, { passive: true })
  useEventListener('pointerdown', cancel, { passive: true })
  useEventListener('keydown', cancel)
  onBeforeUnmount(cancel)

  return (event: MouseEvent) => {
    cancel()
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link?.hash || (link.target && link.target !== '_self') || link.hasAttribute('download')
      || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search) return

    const hash = link.hash
    const target = document.getElementById(hash.slice(1))
    if (!target) return
    const from = window.scrollY
    const started = performance.now()
    const header = link.closest('.chrome')?.querySelector('.chrome-header')
    const offset = Math.max(parseFloat(getComputedStyle(target).scrollMarginTop) || 0, (header?.getBoundingClientRect().height ?? 0) + 12)
    const to = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, from + target.getBoundingClientRect().top - offset))
    const distance = to - from
    const duration = Math.min(380, 200 + Math.abs(distance) * 0.1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (now: number) => {
      if (location.hash !== hash || !target.isConnected) return
      const t = reduced ? 1 : Math.min(1, (now - started) / duration)
      const eased = t * t * (3 - 2 * t)
      window.scrollTo({ top: from + distance * eased, behavior: 'instant' })
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }
}
