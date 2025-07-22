import { defineStore } from 'pinia'
import { debounce } from 'lodash-es'
import type { CookieRef } from '#app'

const saveDebounceTime = 2500

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
        loading: false,
        syncing: false,
        isPushInProgress: false,
        currentDebounce: null as ReturnType<typeof debounce> | null,
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
    getFileId: (state): string | null => {
      return state.userToken?.fileId as string | null ?? null
    },
    getUser: (state) => {
      return state.user as GoogleUser | null
    },
    getUserToken: (state) => {
      return state.userToken as GoogleToken | null
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
      const googleTokenCookie = useCookie('shliste/googleToken', cookieOptions) as CookieRef<string | null>
      googleTokenCookie.value = null
      const googleUserCookie = useCookie('shliste/googleUser', cookieOptions) as CookieRef<string | null>
      googleUserCookie.value = null
    },
    async pull(): Promise<string | null> {
      try {
        if (this.getIsConnected) {
          this.setSyncing(true)

          const fetchedData = await $fetch('/api/pull') as SyncPullResponse

          const googleTokenCookie = useCookie('shliste/googleToken', cookieOptions) as CookieRef<string>
          const updatedToken = {
            ...this.userToken,
            expiry_date: fetchedData.expiry_date,
            access_token: fetchedData.access_token,
            refresh_token: fetchedData.refresh_token,
          } as GoogleToken

          if (fetchedData.fileId) {
            updatedToken.fileId = fetchedData.fileId
          }

          googleTokenCookie.value = JSON.stringify(updatedToken)
          this.setUserToken(updatedToken)

          const fileId = this.getUserToken!.fileId as string | null

          if (fileId && fetchedData.data) {
            const listStore = useListStore()
            const productStore = useProductStore()
            const marketStore = useMarketStore()
            const recipeStore = useRecipeStore()
            const fetchedLists: List[] = fetchedData.data.lists ?? []
            const fetchedProducts: ListedProduct[] = fetchedData.data.products ?? []
            const fetchedMarkets: Market[] = fetchedData.data.markets ?? []
            const fetchedRecipes: Recipe[] = fetchedData.data.recipes ?? []
            listStore.setLists(fetchedLists)
            productStore.setProducts(fetchedProducts)
            marketStore.setMarkets(fetchedMarkets)
            recipeStore.setRecipes(fetchedRecipes)
            return fileId
          }
          else {
            return null
          }
        }
        return null
      }
      catch (error) {
        console.error('Error at Pull', error)
        return null
      }
      finally {
        this.setSyncing(false)
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
            }) as SyncPushResponse

            const googleTokenCookie = useCookie('shliste/googleToken', cookieOptions) as CookieRef<string>
            const updatedToken = {
              ...this.userToken,
              expiry_date: saveResponse.expiry_date,
              access_token: saveResponse.access_token,
              refresh_token: saveResponse.refresh_token,
            } as GoogleToken

            if (saveResponse.fileId) {
              updatedToken.fileId = saveResponse.fileId
            }

            googleTokenCookie.value = JSON.stringify(updatedToken)
            this.setUserToken(updatedToken)

            return true
          }
          catch (error) {
            console.error('Error at Push', error)
          }
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
        }, saveDebounceTime, { leading: false, trailing: true })
        this.currentDebounce()
      }
      else if (this.currentDebounce) {
        this.currentDebounce()
      }
    },

    triggerPush() {
      if (this.getIsConnected === false) {
        return
      }
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
