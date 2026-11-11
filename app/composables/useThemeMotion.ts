import { chooseThemeMotion } from '~/utils/theme-motion'

type Entry = { element: HTMLElement, update: (active: boolean, reduced: boolean) => void }
// Populated exclusively onMounted; no server-side or cross-request state.
const entries = new Map<symbol, Entry>()
let current: symbol | null = null
// Karte unter dem Zeiger oder mit Tastaturfokus: Ihr Bild hat Vorrang vor der Mitte.
let hovered: symbol | null = null
let frame = 0
let stop: (() => void) | undefined
let schedule: (() => void) | undefined

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stop?.()
    entries.clear()
  })
}

export function useThemeMotion(root: Ref<HTMLElement | null>) {
  const active = ref(false)
  const reduced = ref(true)
  const paused = useState('theme-world-motion-paused', () => false)
  const id = Symbol('theme-image')

  watch(paused, () => schedule?.())

  let scope: HTMLElement | null = null
  const claim = (event: Event) => {
    // Auf Touch-Geräten gibt es kein Hover; dort entscheidet allein die Mitte.
    if (event instanceof PointerEvent && event.pointerType !== 'mouse') return
    hovered = id
    schedule?.()
  }
  const release = () => {
    if (hovered !== id) return
    hovered = null
    schedule?.()
  }

  onMounted(() => {
    if (!root.value) return
    scope = root.value.closest<HTMLElement>('[data-theme-motion-scope]') ?? root.value
    scope.addEventListener('pointerenter', claim)
    scope.addEventListener('pointerleave', release)
    scope.addEventListener('focusin', claim)
    scope.addEventListener('focusout', release)
    entries.set(id, { element: root.value, update: (playing, reduce) => {
      active.value = playing
      reduced.value = reduce
    } })
    if (!stop) {
      const media = matchMedia('(prefers-reduced-motion: reduce)')
      const measure = () => {
        frame = 0
        const header = document.querySelector('.chrome-header')?.getBoundingClientRect()
        const top = Math.max(0, header?.bottom ?? 0)
        const width = document.documentElement.clientWidth
        const height = window.innerHeight
        const images = [...entries].map(([key, entry]) => {
          const rect = entry.element.getBoundingClientRect()
          const visibleWidth = Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left))
          const visibleHeight = Math.max(0, Math.min(height, rect.bottom) - Math.max(top, rect.top))
          return { id: key, visibleArea: visibleWidth * visibleHeight, imageArea: rect.width * rect.height, centerDistance: Math.abs((rect.top + rect.bottom) / 2 - (height + top) / 2) }
        })
        current = paused.value || media.matches || document.hidden ? null : chooseThemeMotion(images, current, hovered, (height - top) * 0.05)
        for (const [key, entry] of entries) entry.update(key === current, media.matches)
      }
      schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure)
      }
      const resize = new ResizeObserver(schedule)
      const intersection = new IntersectionObserver(schedule, { threshold: [0, 0.12, 0.5, 1] })
      const observeAll = () => {
        for (const entry of entries.values()) {
          resize.observe(entry.element)
          intersection.observe(entry.element)
        }
      }
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      document.addEventListener('visibilitychange', measure)
      media.addEventListener('change', schedule)
      // Registration events cover sibling images mounted after the first one.
      window.addEventListener('theme-motion-register', observeAll)
      observeAll()
      stop = () => {
        window.removeEventListener('scroll', schedule!)
        window.removeEventListener('resize', schedule!)
        document.removeEventListener('visibilitychange', measure)
        media.removeEventListener('change', schedule!)
        window.removeEventListener('theme-motion-register', observeAll)
        resize.disconnect()
        intersection.disconnect()
        cancelAnimationFrame(frame)
        frame = 0
        current = null
        hovered = null
        schedule = undefined
        stop = undefined
      }
    }
    window.dispatchEvent(new Event('theme-motion-register'))
    schedule?.()
  })
  onBeforeUnmount(() => {
    scope?.removeEventListener('pointerenter', claim)
    scope?.removeEventListener('pointerleave', release)
    scope?.removeEventListener('focusin', claim)
    scope?.removeEventListener('focusout', release)
    release()
    entries.delete(id)
    active.value = false
    if (!entries.size) stop?.()
    else schedule?.()
  })
  return { active, reduced, paused, toggle: () => {
    paused.value = !paused.value
  } }
}
