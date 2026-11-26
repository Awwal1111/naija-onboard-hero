/// <reference lib="webworker" />
// @ts-nocheck
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Share the existing PWA worker with OneSignal. Registering a second worker
// at scope '/' would replace this worker and break offline/PWA behaviour.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')

// Precache only build-versioned assets injected by VitePWA.
// Workbox removes outdated precache entries when a new deployment activates.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Activate the updated worker promptly without creating a second worker.
self.skipWaiting()
clientsClaim()

// Public media only. Do not cache Supabase storage because it can contain
// private profile, verification, or other user-specific images.
registerRoute(
  ({ url }) =>
    url.hostname === 'files.catbox.moe' ||
    url.hostname === 'res.cloudinary.com',
  new CacheFirst({
    cacheName: 'public-media',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 800, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// Cache ordinary non-Supabase images. Supabase responses are deliberately
// network-only so private/user-specific images are never persisted here.
registerRoute(
  ({ request, url }) => request.destination === 'image' && !url.hostname.includes('supabase.co'),
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// Fonts are public static assets and can be cached for a long time.
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

// IMPORTANT: Do not add runtime caching for Supabase REST or Auth requests.
// User-specific API responses and auth state must always be fetched from the
// network. VitePWA already precaches fingerprinted JS/CSS build assets.

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: any = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'NaijaLancers', body: event.data.text() }
  }

  // OneSignal payloads include custom.i (their notification UUID). Let the
  // OneSignal worker runtime display and handle those; this handler is only
  // for legacy NaijaLancers VAPID payloads.
  if (data?.custom?.i) return

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
