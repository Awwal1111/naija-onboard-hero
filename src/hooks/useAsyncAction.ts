import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseAsyncActionOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
  showToast?: boolean
}

interface UseAsyncActionReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>
  isLoading: boolean
  error: Error | null
  reset: () => void
}

/**
 * Safe async action wrapper that catches all errors
 * Prevents unhandled promise rejections from crashing the app
 * 
 * Usage:
 * const { execute, isLoading } = useAsyncAction({
 *   successMessage: 'Saved!',
 *   errorMessage: 'Failed to save'
 * })
 * 
 * const handleClick = () => execute(async () => {
 *   await supabase.from('table').insert(data)
 * })
 */
export function useAsyncAction<T = void>(
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage = 'An error occurred. Please try again.',
    showToast = true
  } = options

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fn()
      
      if (successMessage && showToast) {
        toast.success(successMessage)
      }
      
      onSuccess?.()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      console.error('[useAsyncAction] Error:', error)
      setError(error)
      
      if (showToast) {
        toast.error(errorMessage)
      }
      
      onError?.(error)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError, successMessage, errorMessage, showToast])

  const reset = useCallback(() => {
    setError(null)
    setIsLoading(false)
  }, [])

  return { execute, isLoading, error, reset }
}

/**
 * Wrap any async function to make it safe
 * For use outside of React components
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | undefined> {
  return fn().catch((err) => {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[safeAsync] Caught error:', error)
    errorHandler?.(error)
    return undefined
  })
}
