import OneSignal from 'react-onesignal'

const ONESIGNAL_APP_ID = 'cjra6uzcgncrdkgbjck47m426m3ttugw6nqex554l3jouk5ipk2ujx4au7a55x2sg2wxa75nvlmchokkujqpm5qgd7c6gwbt5vzehma'

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
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: false,
      serviceWorkerParam: { scope: '/' },
      notifyButton: {
        enable: false, // We use our own UI
      },
    })
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
  try {
    const permission = await OneSignal.Notifications.requestPermission()
    console.log('[OneSignal] Permission result:', permission)
    return permission
  } catch (error) {
    console.error('[OneSignal] Permission error:', error)
    return false
  }
}

export const isOneSignalPushEnabled = (): boolean => {
  if (!initialized) return false
  try {
    return OneSignal.Notifications.permission
  } catch {
    return false
  }
}

export { OneSignal }
