import OneSignal from 'react-onesignal'

const ONESIGNAL_APP_ID = 'bdedddd2-3acd-4822-ad6a-88fd37ade488'

let initialized = false

export const initOneSignal = async () => {
  if (initialized) return
  
  // Don't init in iframes or preview hosts
  const isInIframe = (() => {
    try { return window.self !== window.top } catch { return true }
  })()
  const isPreviewHost =
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('localhost')

  if (isInIframe || isPreviewHost) {
    console.log('[OneSignal] Skipping init in preview/iframe')
    return
  }

  try {
    // Guard against the SDK hanging indefinitely (seen in some WebViews) —
    // resolve after 8s so the UI never gets stuck on "Setting up...".
    await Promise.race([
      OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: false,
        serviceWorkerParam: { scope: '/' },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OneSignal init timeout')), 8000)),
    ])
    initialized = true
    console.log('[OneSignal] Initialized successfully')
  } catch (error) {
    console.error('[OneSignal] Init error:', error)
  }
}

export const setOneSignalExternalUserId = async (userId: string) => {
  if (!initialized) return
  try {
    await OneSignal.login(userId)
    console.log('[OneSignal] External user ID set:', userId)
  } catch (error) {
    console.error('[OneSignal] Error setting external user ID:', error)
  }
}

export const removeOneSignalExternalUserId = async () => {
  if (!initialized) return
  try {
    await OneSignal.logout()
    console.log('[OneSignal] External user ID removed')
  } catch (error) {
    console.error('[OneSignal] Error removing external user ID:', error)
  }
}

export const requestOneSignalPermission = async (): Promise<boolean> => {
  if (!initialized) {
    await initOneSignal()
  }

  // Fast path: use the native Notification API directly. OneSignal's
  // requestPermission() can hang silently in WebViews, leaving the UI stuck
  // on "Setting up...". The browser prompt itself is what actually matters
  // for the permission grant; OneSignal picks it up via its own listener.
  try {
    if (typeof Notification === 'undefined') return false

    let perm: NotificationPermission = Notification.permission
    if (perm === 'default') {
      perm = await Promise.race([
        Notification.requestPermission(),
        new Promise<NotificationPermission>((resolve) =>
          setTimeout(() => resolve(Notification.permission), 15000),
        ),
      ])
    }

    // Best-effort: ask OneSignal to opt the user in so the subscription is
    // registered server-side. Don't await — if it hangs we still return.
    try {
      if (initialized && perm === 'granted') {
        OneSignal.User.PushSubscription.optIn().catch(() => {})
      }
    } catch {}

    return perm === 'granted'
  } catch (error) {
    console.error('[OneSignal] Permission error:', error)
    return false
  }
}

export const isOneSignalPushEnabled = (): boolean => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    return true
  }
  if (!initialized) return false
  try {
    return OneSignal.Notifications.permission
  } catch {
    return false
  }
}


export { OneSignal }
