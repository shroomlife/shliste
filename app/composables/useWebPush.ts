/**
 * Web Push — Parität zu FCM (Android) / APNs (iOS).
 * Aktiv, sobald `NUXT_PUBLIC_VAPID_PUBLIC_KEY` gesetzt ist und der Browser
 * PushManager unterstützt. Ohne Key bleibt SSE der Vordergrund-Pfad.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function useWebPush() {
  const config = useRuntimeConfig()
  const vapidKey = computed(() =>
    String((config.public as { vapidPublicKey?: string }).vapidPublicKey ?? '').trim(),
  )

  const isSupported = computed(() =>
    import.meta.client
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && vapidKey.value.length > 0,
  )

  const permission = ref<NotificationPermission>(
    import.meta.client && 'Notification' in window ? Notification.permission : 'default',
  )

  async function subscribe(): Promise<PushSubscriptionJSON | null> {
    if (!isSupported.value || !import.meta.client) return null
    const perm = await Notification.requestPermission()
    permission.value = perm
    if (perm !== 'granted') return null

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing.toJSON()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.value).buffer as ArrayBuffer,
    })
    return subscription.toJSON()
  }

  return { isSupported, permission, vapidConfigured: computed(() => vapidKey.value.length > 0), subscribe }
}
