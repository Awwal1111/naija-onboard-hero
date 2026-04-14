/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Workbox precaching (injected by VitePWA injectManifest)
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Activate immediately and claim all clients
self.skipWaiting()
clientsClaim()

// Force clear all runtime caches on activation to prevent stale content
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== 'workbox-precache-v2' && !name.startsWith('workbox-precache'))
          .map((name) => caches.delete(name))
      )
    })
  )
})

// Cache Supabase storage images with CacheFirst — avoids CDN hits entirely after first load
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// Cache ALL other images with CacheFirst — no revalidation = no egress
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

// Cache fonts with CacheFirst — fonts never change
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// Cache CSS and JS with CacheFirst — hashed filenames mean they're immutable
registerRoute(
  ({ request, url }) =>
    (request.destination === 'style' || request.destination === 'script') &&
    !url.hostname.includes('supabase.co'),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// Cache Supabase REST API GET requests with CacheFirst + short TTL
// This prevents repeated identical queries from hitting the network
registerRoute(
  ({ url, request }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/rest/') &&
    request.method === 'GET',
  new CacheFirst({
    cacheName: 'supabase-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 2 * 60 }), // 2 min TTL
    ],
  })
)

// Cache Supabase auth token endpoint with NetworkFirst (needs freshness)
registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/auth/'),
  new NetworkFirst({
    cacheName: 'supabase-auth',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 }),
    ],
  })
)

// Push notification handler
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

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/main-feed'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})