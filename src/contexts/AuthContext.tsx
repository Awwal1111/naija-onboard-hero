import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { identifyUser, resetPostHog } from '@/lib/posthog'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authTimedOut: boolean
  retryAuth: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  authTimedOut: false,
  retryAuth: () => {},
})

export const useAuthContext = () => useContext(AuthContext)

/**
 * AuthProvider - SINGLE source of truth for auth state.
 * 
 * CRITICAL FIX: Added a hard timeout so the app NEVER gets stuck on "Loading..."
 * If getSession() or onAuthStateChange don't resolve within AUTH_TIMEOUT_MS,
 * loading is set to false and the user is treated as unauthenticated.
 * 
 * This prevents the infinite loading loop that occurs on refresh when:
 * - Service worker serves stale responses
 * - Network is slow/intermittent
 * - Supabase SDK has connectivity issues
 */
const AUTH_TIMEOUT_MS = 8_000 // 8 seconds max wait

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const loadingResolved = useRef(false)
  const isMounted = useRef(true)

  const resolveLoading = (sess: Session | null) => {
    if (!isMounted.current || loadingResolved.current) return
    loadingResolved.current = true
    setSession(sess)
    setUser(sess?.user ?? null)
    setLoading(false)
    setAuthTimedOut(false)
    if (sess?.user) {
      identifyUser(sess.user.id, { email: sess.user.email })
    }
  }

  const retryAuth = () => {
    console.log('[AuthProvider] Manual retry triggered')
    loadingResolved.current = false
    setLoading(true)
    setAuthTimedOut(false)
    
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted.current) return
      resolveLoading(existingSession)
    }).catch((err) => {
      console.error('[AuthProvider] Retry getSession failed:', err)
      if (isMounted.current) {
        loadingResolved.current = true
        setLoading(false)
        setAuthTimedOut(true)
      }
    })
  }

  useEffect(() => {
    isMounted.current = true
    let refreshTimer: NodeJS.Timeout | null = null

    const scheduleTokenRefresh = (sess: Session) => {
      if (refreshTimer) clearTimeout(refreshTimer)
      if (sess?.expires_at) {
        const timeUntilExpiry = sess.expires_at * 1000 - Date.now()
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 5000)
        refreshTimer = setTimeout(async () => {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error('Failed to refresh session:', error)
            await supabase.auth.signOut()
          } else if (data.session && isMounted.current) {
            setSession(data.session)
            setUser(data.session.user)
            scheduleTokenRefresh(data.session)
          }
        }, refreshTime)
      }
    }

    // CRITICAL: Hard timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!loadingResolved.current && isMounted.current) {
        console.warn('[AuthProvider] Auth loading timed out after', AUTH_TIMEOUT_MS, 'ms')
        loadingResolved.current = true
        setLoading(false)
        setAuthTimedOut(true)
      }
    }, AUTH_TIMEOUT_MS)

    // CRITICAL FIX: Set up onAuthStateChange FIRST, BEFORE getSession()
    // This ensures the INITIAL_SESSION event is never missed.
    // Supabase fires INITIAL_SESSION from onAuthStateChange which includes
    // restoring the session from storage. If we call getSession() first,
    // we can miss this event and end up with a null session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (!isMounted.current) return
        console.log('Auth state change:', event, sess?.user?.id ? '(has user)' : '(no user)')
        
        if (event === 'INITIAL_SESSION') {
          // This is the definitive session state from storage
          resolveLoading(sess)
          if (sess) scheduleTokenRefresh(sess)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (!loadingResolved.current) {
            resolveLoading(sess)
          } else {
            setSession(sess)
            setUser(sess?.user ?? null)
            if (sess?.user) identifyUser(sess.user.id, { email: sess.user.email })
          }
          if (sess) scheduleTokenRefresh(sess)
        }

        if (event === 'SIGNED_OUT') {
          if (refreshTimer) clearTimeout(refreshTimer)
          setSession(null)
          setUser(null)
          if (!loadingResolved.current) {
            resolveLoading(null)
          }
        }
      }
    )

    // Fallback: If INITIAL_SESSION hasn't fired within 3s, try getSession
    const fallbackId = setTimeout(() => {
      if (!loadingResolved.current && isMounted.current) {
        console.log('[AuthProvider] INITIAL_SESSION not received, falling back to getSession')
        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
          if (!isMounted.current) return
          resolveLoading(existingSession)
          if (existingSession) scheduleTokenRefresh(existingSession)
        }).catch((err) => {
          console.error('[AuthProvider] Fallback getSession failed:', err)
          if (isMounted.current) resolveLoading(null)
        })
      }
    }, 3000)

    return () => {
      isMounted.current = false
      clearTimeout(timeoutId)
      clearTimeout(fallbackId)
      subscription.unsubscribe()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, authTimedOut, retryAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
