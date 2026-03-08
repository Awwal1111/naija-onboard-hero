/**
 * Stale Cache Auto-Healer
 * 
 * Problem: After app updates, service workers serve cached old JS chunks.
 * Users get stuck on loading screens because old chunks reference deleted modules.
 * The only fix was manually clearing cache — causing massive user churn.
 * 
 * Solution: On every app load, we:
 * 1. Store a build version hash (from Vite)
 * 2. On next load, compare with stored version
 * 3. If different → force SW update + clear old caches → reload ONCE
 * 4. If same version but app hangs → after timeout, auto-clear and reload
 * 
 * This ensures users NEVER need to manually clear cache.
 */

const VERSION_KEY = 'app_build_version'
const HEAL_KEY = 'cache_heal_attempt'
const HEAL_TS_KEY = 'cache_heal_ts'
const HEAL_COOLDOWN_MS = 60_000 // 1 minute between heal attempts

// Vite injects a unique hash per build via import.meta.env
// We use the current timestamp as fallback (changes every deploy)
const BUILD_VERSION = import.meta.env.VITE_BUILD_ID || '__BUILD__'

function isHealCooldown(): boolean {
  try {
    const lastTs = parseInt(sessionStorage.getItem(HEAL_TS_KEY) || '0', 10)
    return Date.now() - lastTs < HEAL_COOLDOWN_MS
  } catch {
    return false
  }
}

function recordHealAttempt(): void {
  try {
    sessionStorage.setItem(HEAL_KEY, 'true')
    sessionStorage.setItem(HEAL_TS_KEY, String(Date.now()))
  } catch {}
}

async function clearAllCaches(): Promise<void> {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    }
    
    // Delete all Cache Storage entries
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
  } catch (e) {
    console.warn('[CacheHealer] Error clearing caches:', e)
  }
}

/**
 * Check if the app version has changed since last load.
 * If so, clear caches and reload to get fresh assets.
 */
export async function checkAndHealCache(): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY)
    
    // Always store current version
    localStorage.setItem(VERSION_KEY, BUILD_VERSION)
    
    // First visit ever — no healing needed
    if (!storedVersion) return
    
    // Same version — no healing needed
    if (storedVersion === BUILD_VERSION) return
    
    // Version changed! New deploy detected.
    console.log('[CacheHealer] New version detected:', storedVersion, '→', BUILD_VERSION)
    
    // Don't heal if we just healed (prevent loops)
    if (isHealCooldown()) {
      console.log('[CacheHealer] In cooldown, skipping')
      return
    }
    
    recordHealAttempt()
    await clearAllCaches()
    
    console.log('[CacheHealer] Caches cleared, reloading for fresh assets...')
    window.location.reload()
  } catch (e) {
    console.warn('[CacheHealer] Error in cache check:', e)
  }
}

/**
 * Emergency heal: called when the app detects it's stuck
 * (e.g., auth timeout, chunk errors, blank screen)
 * Only runs once per cooldown period.
 */
export async function emergencyHeal(): Promise<boolean> {
  if (isHealCooldown()) return false
  
  console.log('[CacheHealer] Emergency heal triggered')
  recordHealAttempt()
  await clearAllCaches()
  
  // Clear auth-related storage that might be stale
  try {
    // Remove Supabase auth tokens so they're re-fetched
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase.auth') || key.includes('sb-'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {}
  
  window.location.href = '/login'
  return true
}
