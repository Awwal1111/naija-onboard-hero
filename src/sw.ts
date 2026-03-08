/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Workbox precaching (injected by VitePWA injectManifest)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Activate immediately
self.skipWaiting()
clientsClaim()

// Push notification handler - shows notification with app logo
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: any = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'NaijaLancers', body: event.data.text() }
  }

  const options: NotificationOptions = {
    body: data.body || '',
    icon: data.icon || '/icon-512.png',
    badge: data.badge || '/icon-512.png',
    data: {
      url: data.url || '/main-feed',
      ...data.data
    },
    vibrate: [200, 100, 200] as any,
    tag: data.tag || 'naijalancers-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'NaijaLancers', options)
  )
})

// Notification click handler - opens the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/main-feed'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if found
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open new window
      return self.clients.openWindow(url)
    })
  )
})
