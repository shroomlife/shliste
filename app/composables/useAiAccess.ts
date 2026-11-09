/** UI gate; the API remains the authority for every paid request. */
export function useAiAccess() {
  const { isSignedIn } = useAuth()
  const { data, refresh } = useFetch<{ enabled: boolean, state: string }>('/api/waitlist/status', { server: false, key: 'ai-access' })
  const canUseAi = computed(() => isSignedIn.value && data.value?.enabled === true)
  return { canUseAi, aiAccess: data, refreshAiAccess: refresh }
}
