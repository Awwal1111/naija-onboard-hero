/**
 * Chunk Error Recovery System
 * 
 * When the app is updated, old JS chunks become unavailable.
 * If the service worker serves stale references, lazy imports fail with ChunkLoadError.
 * This module handles graceful recovery by reloading ONCE.
 * 
 * A reload-loop breaker prevents infinite reloads if the error persists.
 */

const RELOAD_KEY = 'chunk_reload_attempt';
const RELOAD_TIMESTAMP_KEY = 'chunk_reload_ts';
const MAX_RELOADS = 2;
const RELOAD_WINDOW_MS = 30_000; // 30 seconds

/**
 * Check if we're stuck in a reload loop
 */
function isInReloadLoop(): boolean {
  try {
    const count = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
    const lastTs = parseInt(sessionStorage.getItem(RELOAD_TIMESTAMP_KEY) || '0', 10);
    const elapsed = Date.now() - lastTs;

    // Reset counter if enough time has passed
    if (elapsed > RELOAD_WINDOW_MS) {
      sessionStorage.removeItem(RELOAD_KEY);
      sessionStorage.removeItem(RELOAD_TIMESTAMP_KEY);
      return false;
    }

    return count >= MAX_RELOADS;
  } catch {
    return false;
  }
}

/**
 * Record a reload attempt
 */
function recordReloadAttempt(): void {
  try {
    const count = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
    sessionStorage.setItem(RELOAD_KEY, String(count + 1));
    sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

/**
 * Clear reload tracking (call on successful app load)
 */
export function clearReloadTracking(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
    sessionStorage.removeItem(RELOAD_TIMESTAMP_KEY);
  } catch {
    // ignore
  }
}

/**
 * Handle chunk load errors by reloading the page once.
 * Returns true if it will reload, false if we should show error UI.
 */
export function handleChunkError(error: Error): boolean {
  const isChunkError =
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Importing a module script failed') ||
    error.message?.includes('error loading dynamically imported module');

  if (!isChunkError) return false;

  console.warn('[ChunkErrorHandler] Detected chunk load error:', error.message);

  if (isInReloadLoop()) {
    console.error('[ChunkErrorHandler] Reload loop detected, stopping. User must clear cache.');
    return false; // Let error boundary show UI with "clear cache" option
  }

  console.log('[ChunkErrorHandler] Attempting recovery reload...');
  recordReloadAttempt();

  // Unregister service workers before reload to get fresh assets
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    }).finally(() => {
      // Force reload from network (bypass cache)
      window.location.reload();
    });
  } else {
    window.location.reload();
  }

  return true; // Will reload
}

/**
 * Wrap a lazy import to handle chunk errors gracefully
 */
export function lazyWithRetry(importFn: () => Promise<any>): () => Promise<any> {
  return () =>
    importFn().catch((error: Error) => {
      if (handleChunkError(error)) {
        // Return a never-resolving promise while we reload
        return new Promise(() => {});
      }
      throw error;
    });
}
