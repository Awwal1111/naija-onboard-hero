import { useEffect } from 'react'
import { toast } from 'sonner'
import { handleChunkError } from '@/utils/chunkErrorHandler'

/**
 * Global Error Handler Component
 * 
 * Catches unhandled promise rejections and global errors
 * to prevent the app from crashing silently.
 */
export const GlobalErrorHandler = () => {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      
      // CRITICAL: Handle chunk load errors - attempt recovery reload
      if (handleChunkError(error)) {
        event.preventDefault()
        return
      }
      
      console.error('[GlobalErrorHandler] Unhandled rejection:', event.reason)
      
      // Prevent the default browser behavior (console error)
      event.preventDefault()
      
      // Extract meaningful error message
      let message = 'An unexpected error occurred'
      if (event.reason instanceof Error) {
        message = event.reason.message
      } else if (typeof event.reason === 'string') {
        message = event.reason
      }
      
      // Don't show toast for network errors or aborted requests
      const suppressedErrors = [
        'Failed to fetch',
        'NetworkError',
        'AbortError',
        'The operation was aborted',
        'Load failed',
        'cancelled'
      ]
      
      const shouldSuppress = suppressedErrors.some(
        (err) => message.toLowerCase().includes(err.toLowerCase())
      )
      
      if (!shouldSuppress) {
        toast.error('Something went wrong. Please try again.')
      }
    }

    // Handle global errors (synchronous) - also catch chunk errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && handleChunkError(event.error)) {
        event.preventDefault()
        return
      }
      console.error('[GlobalErrorHandler] Global error:', event.error)
    }

    // Debounce offline notifications — mobile networks blip frequently,
    // and showing a "network error" toast on first launch makes the app
    // look broken. Only warn if user has been offline for >4 seconds.
    let offlineTimer: ReturnType<typeof setTimeout> | null = null
    let wasReallyOffline = false

    const handleOffline = () => {
      if (offlineTimer) clearTimeout(offlineTimer)
      offlineTimer = setTimeout(() => {
        if (!navigator.onLine) {
          wasReallyOffline = true
          toast.warning('You are offline. Some features may not work.')
        }
      }, 4000)
    }

    const handleOnline = () => {
      if (offlineTimer) {
        clearTimeout(offlineTimer)
        offlineTimer = null
      }
      if (wasReallyOffline) {
        wasReallyOffline = false
        toast.success('You are back online!')
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return null
}

export default GlobalErrorHandler
