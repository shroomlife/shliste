/**
 * Netzwerkstatus des Browsers.
 *
 * Bewusst kein blosses `navigator.onLine`: Das meldet nur, ob eine Verbindung
 * zum lokalen Netz besteht, nicht ob das Internet erreichbar ist. Ein WLAN im
 * Supermarkt ohne Durchgang meldet damit faelschlich "online". Deshalb laesst
 * sich der Wert zusaetzlich korrigieren, sobald ein echter Aufruf an die eigene
 * BFF scheitert oder gelingt.
 *
 * SSR-sicher: Auf dem Server gibt es keinen Navigator, dort gilt "online",
 * damit nichts faelschlich als offline gerendert wird.
 */
export function useNetworkStatus() {
  // useState statt ref: der Zustand soll app-weit derselbe sein, nicht pro
  // Komponente neu entstehen.
  const isOnline = useState<boolean>('network-online', () => true)

  /**
   * Meldet das Ergebnis eines echten Netzaufrufs zurueck. Damit korrigiert
   * sich die Anzeige auch dann, wenn der Browser faelschlich "online" meldet.
   */
  function reportResult(succeeded: boolean): void {
    isOnline.value = succeeded
  }

  onMounted(() => {
    isOnline.value = navigator.onLine

    const handleOnline = (): void => {
      isOnline.value = true
    }
    const handleOffline = (): void => {
      isOnline.value = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    onBeforeUnmount(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  })

  return {
    isOnline: readonly(isOnline),
    reportResult,
  }
}
