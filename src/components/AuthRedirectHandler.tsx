import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * AuthRedirectHandler - handles initial redirect for logged-in users
 * who land on auth pages (/, /login, /signup).
 * 
 * This replaces the redirect logic that was previously inside
 * the useAuth hook's onAuthStateChange listener.
 */
const AuthRedirectHandler = () => {
  const { user, loading, handleInitialRedirect } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (loading || hasRun.current) return
    if (user) {
      hasRun.current = true
      handleInitialRedirect()
    }
  }, [user, loading, handleInitialRedirect])

  return null
}

export default AuthRedirectHandler
