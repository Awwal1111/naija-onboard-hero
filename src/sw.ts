/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Workbox precaching (injected by VitePWA injectManifest)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Activate immediately
self.skipWaiting()
clientsClaim()

// Cache Supabase storage images (profile pictures, post media, etc.)
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }), // 7 days
    ],
  })
)

// Cache other image requests (avatars, icons)
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
)

// Push notification handler - shows notification with app logo
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: any = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'NaijaLancers', body: event.data.text() }
  }

  const options: any = {
    body: data.body || '',
    icon: data.icon || '/icon-512.png',
    badge: data.badge || '/icon-512.png',
    data: {
      url: data.url || '/main-feed',
      ...data.data
    },
    vibrate: [200, 100, 200],
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
