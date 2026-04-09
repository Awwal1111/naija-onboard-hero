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

// Cache Supabase storage images with CacheFirst — avoids CDN hits entirely after first load
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
)

// Cache ALL other images with CacheFirst too — no revalidation = no egress
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// Cache Supabase REST API GET requests (profiles, posts, etc.) — reduces repeated DB egress
registerRoute(
  ({ url, request }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/rest/') &&
    request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'supabase-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }), // 5 min
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