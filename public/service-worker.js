// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  let notificationData = {
    title: 'NaijaLancers',
    body: 'You have a new notification',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    tag: 'naijalancers-notification',
    requireInteraction: false,
    url: '/main-feed'
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || `naijalancers-${Date.now()}`,
        data: data.data || {},
        url: data.url || notificationData.url,
        requireInteraction: data.requireInteraction || false,
      }
    } catch (error) {
      console.error('Error parsing push notification data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      vibrate: [100, 50, 100],
      data: { ...notificationData.data, url: notificationData.url },
      requireInteraction: notificationData.requireInteraction,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  event.notification.close()

  // Open the app or navigate to specific page
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window if app is not open
      if (self.clients.openWindow) {
        const urlToOpen = event.notification.data?.url || '/'
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})
