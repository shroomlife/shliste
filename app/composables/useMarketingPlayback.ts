export function useMarketingPlayback(count: number, interval: number | ((phase: number) => number) = 3200) {
  const root = ref<HTMLElement>()
  const phase = ref(0)
  const paused = ref(false)
  const reduced = ref(false)
  const visible = ref(false)
  const foreground = ref(true)
  const running = computed(() => visible.value && foreground.value && !paused.value && !reduced.value)
  let timer: ReturnType<typeof setTimeout> | undefined
  let observer: IntersectionObserver | undefined
  let media: MediaQueryList | undefined
  const motion = () => {
    reduced.value = media?.matches ?? false
  }
  const visibility = () => {
    foreground.value = !document.hidden
  }
  onMounted(() => {
    media = matchMedia('(prefers-reduced-motion: reduce)')
    motion()
    visibility()
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    observer = new IntersectionObserver(([entry]) => {
      visible.value = !!entry?.isIntersecting
    }, { threshold: 0.15 })
    if (root.value) observer.observe(root.value)
  })
  watch([running, phase], ([play, step]) => {
    clearTimeout(timer)
    if (play) timer = setTimeout(() => {
      phase.value = (step + 1) % count
    }, typeof interval === 'number' ? interval : interval(step))
  })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    observer?.disconnect()
    media?.removeEventListener('change', motion)
    document.removeEventListener('visibilitychange', visibility)
  })
  function choose(index: number) {
    phase.value = index
    paused.value = true
  }
  return { root, phase, paused, reduced, running, choose }
}
