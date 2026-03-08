import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

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
 * CRITICAL FIX: Uses getSession() FIRST to restore session from storage,
 * then subscribes to onAuthStateChange for subsequent updates.
 * This prevents the race condition where INITIAL_SESSION fires before
 * the listener is ready, causing infinite loading on refresh.
 */
const AUTH_TIMEOUT_MS = 8_000

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const initialized = useRef(false)
  const isMounted = useRef(true)

  const retryAuth = () => {
    console.log('[AuthProvider] Manual retry triggered')
    initialized.current = false
    setLoading(true)
    setAuthTimedOut(false)
    
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!isMounted.current) return
      initialized.current = true
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      console.error('[AuthProvider] Retry getSession failed:', err)
      if (isMounted.current) {
        initialized.current = true
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
      if (!initialized.current && isMounted.current) {
        console.warn('[AuthProvider] Auth loading timed out after', AUTH_TIMEOUT_MS, 'ms')
        initialized.current = true
        setLoading(false)
        setAuthTimedOut(true)
      }
    }, AUTH_TIMEOUT_MS)

    // STEP 1: Restore session from storage FIRST
    // This is synchronous from localStorage and resolves immediately
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted.current) return
      
      console.log('[AuthProvider] getSession resolved:', currentSession ? '(has session)' : '(no session)')
      
      if (!initialized.current) {
        initialized.current = true
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
        setAuthTimedOut(false)
        
        if (currentSession) {
          scheduleTokenRefresh(currentSession)
        }
      }
    }).catch((err) => {
      console.error('[AuthProvider] getSession failed:', err)
      if (isMounted.current && !initialized.current) {
        initialized.current = true
        setLoading(false)
        setAuthTimedOut(true)
      }
    })

    // STEP 2: Subscribe to auth changes for sign in/out/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (!isMounted.current) return
        console.log('[AuthProvider] Auth event:', event, sess?.user?.id ? '(has user)' : '(no user)')

        // If getSession hasn't resolved yet, use this event to initialize
        if (!initialized.current && event === 'INITIAL_SESSION') {
          initialized.current = true
          setSession(sess)
          setUser(sess?.user ?? null)
          setLoading(false)
          setAuthTimedOut(false)
          if (sess) scheduleTokenRefresh(sess)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(sess)
          setUser(sess?.user ?? null)
          if (!initialized.current) {
            initialized.current = true
            setLoading(false)
            setAuthTimedOut(false)
          }
          if (sess) scheduleTokenRefresh(sess)
        }

        if (event === 'SIGNED_OUT') {
          if (refreshTimer) clearTimeout(refreshTimer)
          setSession(null)
          setUser(null)
          if (!initialized.current) {
            initialized.current = true
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted.current = false
      clearTimeout(timeoutId)
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
