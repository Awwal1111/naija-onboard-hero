import OneSignal from 'react-onesignal'

const ONESIGNAL_APP_ID = 'bdedddd2-3acd-4822-ad6a-88fd37ade488'
const SERVICE_WORKER_PATH = '/sw.js'

let initialized = false
let initPromise: Promise<boolean> | null = null

const isUnsupportedContext = () => {
  const isInIframe = (() => {
    try { return window.self !== window.top } catch { return true }
  })()
  const hostname = window.location.hostname
  const isPreviewHost =
    hostname.includes('id-preview--') ||
    hostname.includes('lovableproject.com') ||
    hostname === 'localhost'

  return isInIframe || isPreviewHost
}

export const initOneSignal = async (): Promise<boolean> => {
  if (initialized) return true
  if (initPromise) return initPromise
  if (typeof window === 'undefined' || isUnsupportedContext()) return false

  initPromise = (async () => {
    try {
      await Promise.race([
        OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: false,
          serviceWorkerPath: SERVICE_WORKER_PATH,
          serviceWorkerParam: { scope: '/' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OneSignal initialization timed out')), 12000),
        ),
      ])
      initialized = true
      console.info('[OneSignal] Initialized with the shared PWA service worker')
      return true
    } catch (error) {
      console.error('[OneSignal] Initialization failed:', error)
      return false
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

export const setOneSignalExternalUserId = async (userId: string) => {
  if (!initialized) return false
  try {
    await OneSignal.login(userId)
    console.info('[OneSignal] User linked')
    return true
  } catch (error) {
    console.error('[OneSignal] User linking failed:', error)
    return false
  }
}

export const removeOneSignalExternalUserId = async () => {
  if (!initialized) return false
  try {
    await OneSignal.logout()
    return true
  } catch (error) {
    console.error('[OneSignal] Logout failed:', error)
    return false
  }
}

/** True only when OneSignal confirms an opted-in push subscription. */
export const isOneSignalPushEnabled = (): boolean => {
  if (!initialized || typeof Notification === 'undefined') return false
  try {
    return Notification.permission === 'granted' &&
      OneSignal.User.PushSubscription.optedIn === true &&
      Boolean(OneSignal.User.PushSubscription.id)
  } catch {
    return false
  }
}

export const requestOneSignalPermission = async (): Promise<boolean> => {
  const ready = initialized || await initOneSignal()
  if (!ready) return false

  try {
    const granted = await OneSignal.Notifications.requestPermission()
    if (!granted) return false

    await OneSignal.User.PushSubscription.optIn()

    // OneSignal may finish creating the subscription shortly after opt-in.
    // Verify the actual OneSignal subscription; browser permission alone is
    // not proof that push delivery is configured.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (isOneSignalPushEnabled()) return true
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.warn('[OneSignal] Permission granted, but no opted-in subscription was confirmed')
    return false
  } catch (error) {
    console.error('[OneSignal] Push subscription failed:', error)
    return false
  }
}

export { OneSignal }
