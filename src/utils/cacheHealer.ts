/**
 * Safe PWA cache recovery.
 *
 * Never clear all browser caches, unregister the active service worker, or
 * delete authentication/local storage automatically. Those actions can log
 * users out, interfere with OneSignal, and make a normal refresh less reliable.
 */

const VERSION_KEY = 'app_build_version'
const BUILD_VERSION = import.meta.env.VITE_BUILD_ID || '__BUILD__'

/**
 * Record the current build and ask the existing worker to check for an update.
 * Workbox/VitePWA manages versioned precache entries during worker activation.
 */
export async function checkAndHealCache(): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY)
    localStorage.setItem(VERSION_KEY, BUILD_VERSION)

    if (storedVersion && storedVersion !== BUILD_VERSION && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/')
      await registration?.update().catch((error) => {
        console.warn('[CacheHealer] Service worker update check failed:', error)
      })
    }
  } catch (error) {
    console.warn('[CacheHealer] Safe update check failed:', error)
  }
}

/**
 * Manual recovery for a stale API cache left by older app versions.
 * Only removes the two legacy Supabase runtime caches; it preserves login
 * tokens, preferences, media, the active service worker, and push settings.
 */
export async function emergencyHeal(): Promise<boolean> {
  try {
    if ('caches' in window) {
      await Promise.all([
        caches.delete('supabase-api'),
        caches.delete('supabase-auth'),
      ])
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/')
      await registration?.update().catch((error) => {
        console.warn('[CacheHealer] Service worker update check failed:', error)
      })
    }

    window.location.reload()
    return true
  } catch (error) {
    console.warn('[CacheHealer] Targeted recovery failed:', error)
    window.location.reload()
    return false
  }
}
