import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
})

export const useAuthContext = () => useContext(AuthContext)

/**
 * AuthProvider - SINGLE source of truth for auth state.
 * 
 * CRITICAL: This replaces having useAuth() create separate subscriptions
 * in every ProtectedRoute. Now there is exactly ONE onAuthStateChange listener.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let refreshTimer: NodeJS.Timeout | null = null
    let isMounted = true

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
          } else if (data.session && isMounted) {
            setSession(data.session)
            setUser(data.session.user)
            scheduleTokenRefresh(data.session)
          }
        }, refreshTime)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        if (!isMounted) return
        console.log('Auth state change:', event, sess?.user?.id ? '(has user)' : '(no user)')
        
        setSession(sess)
        setUser(sess?.user ?? null)
        setLoading(false)

        if (sess) {
          scheduleTokenRefresh(sess)
        }

        if (event === 'SIGNED_OUT') {
          if (refreshTimer) clearTimeout(refreshTimer)
          setSession(null)
          setUser(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
