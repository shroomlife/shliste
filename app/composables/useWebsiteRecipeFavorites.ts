import { useEventListener } from '@vueuse/core'

const key = 'shliste.website.recipe-favorites.v1'

function readFavorites(): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) || '[]')
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]+$/.test(id)))] : []
}

export function useWebsiteRecipeFavorites() {
  const favorites = useState<string[]>('websiteRecipeFavorites', () => [])
  const notice = ref('')
  const refresh = () => {
    try {
      favorites.value = readFavorites()
    }
    catch { /* Keep the in-memory view when browser storage is unavailable. */ }
  }
  onMounted(refresh)
  useEventListener('storage', (event) => {
    if (event.key === key || event.key === null) refresh()
  })
  function toggleFavorite(id: string) {
    try {
      let previous: string[]
      try {
        previous = readFavorites()
      }
      catch {
        previous = favorites.value
      }
      const remove = previous.includes(id)
      const next = remove ? previous.filter(item => item !== id) : [...previous, id]
      localStorage.setItem(key, JSON.stringify(next))
      favorites.value = next
      notice.value = ''
    }
    catch {
      notice.value = 'Dein Browser konnte die Favoriten auf diesem Gerät nicht speichern.'
    }
  }
  return { favorites, notice, toggleFavorite }
}
