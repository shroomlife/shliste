import { defineStore } from 'pinia'
import { debounce } from 'lodash-es'

const getUserToken = (): GoogleToken | null => {
  const googleTokenCookie = useCookie('shliste/googleToken', cookieOptions)
  if (googleTokenCookie.value) {
    return Object(googleTokenCookie.value) as GoogleToken
  }
  return null
}

const getUser = (): GoogleUser | null => {
  const googleUserCookie = useCookie('shliste/googleUser', cookieOptions)
  if (googleUserCookie.value) {
    return Object(googleUserCookie.value) as GoogleUser
  }
  return null
}

export const useGoogleStore = defineStore('googleStore', {
  state: () => {
    const userToken = getUserToken()
    const user = getUser()

    if (!userToken || !user) {
      return {
        lastSynced: null as Date | null,
        lastUpdated: null as Date | null,
        user: null as GoogleUser | null,
        userToken: null as GoogleToken | null,
      }
    }

    return {
      lastSynced: null as Date | null,
      lastUpdated: null as Date | null,
      user,
      userToken,
      loading: false,
      syncing: false,
      isPushInProgress: false,
      currentDebounce: null as ReturnType<typeof debounce> | null,
    }
  },
  getters: {
    getIsConnected: (state) => {
      return state.userToken !== null
    },
    getUser: (state) => {
      return state.user as GoogleUser | null
    },
    getLoading: (state) => {
      return state.loading
    },
    getIsSyncing: (state) => {
      return state.syncing
    },
    getIsPushInProgress: (state) => {
      return state.isPushInProgress
    },
  },
  actions: {
    setUserToken(token: GoogleToken | null) {
      this.userToken = token
    },
    setUser(user: GoogleUser | null) {
      this.user = user
    },
    setLastSynced(date: Date | null) {
      this.lastSynced = date
    },
    setLastUpdated(date: Date | null) {
      this.lastUpdated = date
    },
    setLoading(loading: boolean) {
      this.loading = loading
    },
    setSyncing(syncing: boolean) {
      this.syncing = syncing
    },
    setIsPushInProgress(isPushInProgress: boolean) {
      this.isPushInProgress = isPushInProgress
    },
    async connect() {
      const loginResponse = await $fetch('/api/auth/login') as { url: string }
      navigateTo(loginResponse.url, {
        external: true,
      })
    },
    logout() {
      this.setUserToken(null)
      this.setLastSynced(null)
      this.setLastUpdated(null)
      this.setUser(null)
      const googleTokenCookie = useCookie('shliste/googleToken')
      googleTokenCookie.value = null
      const googleUserCookie = useCookie('shliste/googleUser')
      googleUserCookie.value = null
    },
    async pull(): Promise<boolean> {
      try {
        if (this.getIsConnected) {
          this.setSyncing(true)

          const fetchedData = await $fetch('/api/pull') as {
            data: GoogleDriveSyncRequestRaw
            fileId: string
          }

          const listStore = useListStore()
          const productStore = useProductStore()

          const localLists = listStore.getLists // Annahme: Gibt List[] zurück
          const localProducts = productStore.getProducts // Annahme: Gibt Product[] zurück

          const localData: GoogleDriveSyncRequestRaw = {
            lists: JSON.stringify(localLists),
            products: JSON.stringify(localProducts),
          }

          const mergedData = mergeData(localData, fetchedData.data)

          const mergedLists = JSON.parse(mergedData.lists) as List[]
          const mergedProducts = JSON.parse(mergedData.products) as ListedProduct[]

          listStore.setLists(mergedLists)
          productStore.setProducts(mergedProducts)

          const googleTokenCookie = useCookie('shliste/googleToken')
          const updatedToken = {
            ...this.userToken,
            fileId: fetchedData.fileId,
          } as GoogleToken

          googleTokenCookie.value = JSON.stringify(updatedToken)
          this.setUserToken(updatedToken)

          this.setSyncing(false)
          return true
        }
        this.setSyncing(false)
        return false
      }
      catch (error) {
        this.setSyncing(false)
        console.error('Error at Pull', error)
        return false
      }
    },
    async push(): Promise<boolean> {
      try {
        if (this.getIsConnected) {
          this.setSyncing(true)
          const data = useSync()
          const dataJson = JSON.stringify(data)
          try {
            const saveResponse = await $fetch('/api/push', {
              body: dataJson,
              method: 'POST',
            }) as { id: string }

            const googleTokenCookie = useCookie('shliste/googleToken')
            googleTokenCookie.value = JSON.stringify({
              ...this.userToken,
              fileId: saveResponse.id,
            })

            const currentToken = getUserToken()
            if (currentToken) {
              currentToken.fileId = saveResponse.id
              this.setUserToken(currentToken)
            }
          }
          catch (error) {
            console.error('Error at Sync', error)
            this.logout()
            const toast = useToast()
            toast.add({
              title: 'Fehler',
              description: 'Beim Synchronisieren ist ein Fehler aufgetreten. Bitte melde dich erneut mit Google an.',
              color: 'red',
              icon: 'i-ph-warning-bold',
              timeout: 0,
            })
          }
          return true
        }
        return false
      }
      catch (error) {
        console.error('Error at Push', error)
        return false
      }
      finally {
        this.setSyncing(false)
        window.onbeforeunload = null
      }
    },
    debouncedPush() {
      if (!this.isPushInProgress) {
        this.setIsPushInProgress(true)
        this.currentDebounce = debounce(async function (this: ReturnType<typeof useGoogleStore>) {
          await this.push()
          this.setIsPushInProgress(false)
        }, 3000, { leading: false, trailing: true })
        this.currentDebounce()
      }
      else if (this.currentDebounce) {
        this.currentDebounce()
      }
    },

    triggerPush() {
      this.debouncedPush()
      window.onbeforeunload = () => {
        if (this.currentDebounce) {
          this.currentDebounce.flush()
        }
        return 'Es gibt noch nicht gesynchronisierte Änderungen. Wollen Sie die Seite wirklich verlassen?'
      }
    },
  },
})
