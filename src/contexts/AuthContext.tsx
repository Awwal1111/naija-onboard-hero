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

  // Always accept the latest session snapshot, even if the initial loading
  // timeout already fired. A slow INITIAL_SESSION event must not be discarded.
  const resolveLoading = (sess: Session | null) => {
    if (!isMounted.current) return
    setSession(sess)
    setUser(sess?.user ?? null)
    if (!loadingResolved.current) {
      loadingResolved.current = true
      setLoading(false)
    }
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

    // Retrying must also be bounded: a stalled auth request should return
    // to the recovery screen rather than leave the user on an endless spinner.
    let settled = false
    const timeoutId = setTimeout(() => {
      if (!isMounted.current || settled) return
      settled = true
      loadingResolved.current = true
      setLoading(false)
      setAuthTimedOut(true)
    }, AUTH_TIMEOUT_MS)

    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (!isMounted.current || settled) return
      settled = true
      clearTimeout(timeoutId)
      if (error) {
        console.error('[AuthProvider] Retry getSession returned an error:', error)
        loadingResolved.current = true
        setLoading(false)
        setAuthTimedOut(true)
        return
      }
      resolveLoading(existingSession)
    }).catch((err) => {
      if (!isMounted.current || settled) return
      settled = true
      clearTimeout(timeoutId)
      console.error('[AuthProvider] Retry getSession failed:', err)
      loadingResolved.current = true
      setLoading(false)
      setAuthTimedOut(true)
    })
  }

  useEffect(() => {
    isMounted.current = true
    // Supabase client already has autoRefreshToken enabled. Do not run a
    // second refresh timer here: duplicate refresh requests can race, and a
    // temporary network failure must never force a user sign-out.

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
        }

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          resetPostHog()
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
    }
  }, [])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    const pending = localStorage.getItem('nl_pending_signup_consent')
    if (!pending) return
    let consent: any
    try { consent = JSON.parse(pending) } catch { localStorage.removeItem('nl_pending_signup_consent'); return }
    const recordConsent = async () => {
      const { error } = await supabase.from('signup_consents').insert({
        user_id: user.id,
        accepted_at: consent.acceptedAt,
        terms_version: consent.termsVersion,
        privacy_version: consent.privacyVersion,
        telegram_notifications_opt_in: !!consent.telegramNotifications,
        marketing_updates_opt_in: !!consent.marketingUpdates
      })
      if (error) {
        console.error('[AuthProvider] Could not record OAuth signup consent:', error)
        return
      }
      const { error: preferencesError } = await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        telegram_enabled: !!consent.telegramNotifications,
        marketing_updates_enabled: !!consent.marketingUpdates
      }, { onConflict: 'user_id' })
      if (preferencesError) console.error('[AuthProvider] Could not save OAuth notification preferences:', preferencesError)
      localStorage.removeItem('nl_pending_signup_consent')
    }
    void recordConsent()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    const partnerSlug = localStorage.getItem('nl_partner_slug')
    if (!partnerSlug) return
    supabase.rpc('attach_institutional_partner_attribution', { p_slug: partnerSlug })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AuthProvider] Partner attribution could not be applied:', error.message)
          return
        }
        if (data === true) localStorage.removeItem('nl_partner_slug')
      })
  }, [user?.id])

  return (
    <AuthContext.Provider value={{ user, session, loading, authTimedOut, retryAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
