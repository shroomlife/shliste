/** Tracks the section at the reading line without moving the scroll position. */
export function useMarketingReading() {
  const readingRoot = ref<HTMLElement>()
  const activeSection = ref(0)
  let frame = 0
  function measure() {
    frame = 0
    const sections = readingRoot.value?.querySelectorAll<HTMLElement>('[data-reading-step]')
    if (!sections?.length)
      return
    const readingLine = Math.min(240, window.innerHeight * 0.3)
    let current = 0
    sections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= readingLine)
        current = index
    })
    activeSection.value = current
  }
  function schedule() {
    if (!frame)
      frame = requestAnimationFrame(measure)
  }
  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    schedule()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
  })
  return { readingRoot, activeSection }
}
