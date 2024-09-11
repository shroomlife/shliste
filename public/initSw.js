if (typeof window.navigator !== 'undefined') {
  if (typeof window.navigator.serviceWorker !== 'undefined') {
    window.navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
  }
}
