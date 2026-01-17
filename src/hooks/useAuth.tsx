import { useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC check at module load - NO async calls
const isMiniPayEnv = detectMiniPaySync().isMiniPay

export const useAuth = () => {
  // In MiniPay, we skip most auth logic - wallet is identity
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  // In MiniPay, loading is always false to prevent flickering
  const [loading, setLoading] = useState(!isMiniPayEnv)
  const navigate = useNavigate()
  const { toast } = useToast()
  const hasInitializedRef = useRef(false)

  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password']
  const mainAppPaths = ['/feed', '/profile', '/chat', '/earn', '/experts', '/jobs']

  const checkProfileAndRedirect = async (user: any, isSignup: boolean = false) => {
    try {
      // Wait a bit for the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // If no profile exists after waiting, redirect to onboarding
      // (the trigger should have created it)
      if (!profile) {
        console.log('Profile not found - redirecting to onboarding')
        navigate('/onboarding')
        return
      }
      
      // Check if onboarding is completed
      const isOnboardingComplete = profile.full_name && profile.state_name && profile.lga_name
      
      // For new signups
      if (isSignup) {
        if (isOnboardingComplete) {
          // Profile is complete, go to main feed
          console.log('Signup with complete profile - redirecting to main feed')
          navigate('/main-feed')
        } else {
          // Profile needs completion, go to onboarding
          console.log('Signup with incomplete profile - redirecting to onboarding')
          navigate('/onboarding')
        }
        return
      }
      
      // For login and existing sessions
      if (isOnboardingComplete) {
        // Existing user with complete onboarding - redirect to main feed
        console.log('Existing user login - redirecting to main feed')
        navigate('/main-feed')
      } else {
        // Existing user with incomplete onboarding - redirect to onboarding
        console.log('Existing user with incomplete onboarding - redirecting to onboarding')
        navigate('/onboarding')
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      // On error, redirect to onboarding as fallback
      navigate('/onboarding')
    }
  }

  useEffect(() => {
    // SKIP all auth logic in MiniPay - wallet is identity
    if (isMiniPayEnv) {
      setLoading(false)
      return
    }

    // Prevent double initialization
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    let isInitialLoad = true
    let refreshTimer: NodeJS.Timeout | null = null
    
    // Check if we've already done the initial auth redirect in this session
    const hasInitialRedirect = sessionStorage.getItem('hasAuthRedirect') === 'true'
    
    // Proactive session refresh - refresh token 5 minutes before expiry
    const scheduleTokenRefresh = (session: Session) => {
      if (refreshTimer) clearTimeout(refreshTimer)
      
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 5000) // 5 min before expiry, min 5 seconds
        
        console.log(`Token will be refreshed in ${Math.round(refreshTime / 1000)} seconds`)
        
        refreshTimer = setTimeout(async () => {
          console.log('Proactively refreshing token...')
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error('Failed to refresh session:', error)
            // If refresh fails, sign user out
            await supabase.auth.signOut()
          } else if (data.session) {
            console.log('Token refreshed proactively')
            setSession(data.session)
            setUser(data.session.user)
            scheduleTokenRefresh(data.session) // Schedule next refresh
          }
        }, refreshTime)
      }
    }
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignore repeated INITIAL_SESSION events to prevent render loops
        if (event === 'INITIAL_SESSION') {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
          if (session) {
            scheduleTokenRefresh(session)
          }
          return
        }
        
        console.log('Auth state change:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Schedule proactive token refresh whenever we get a session
        if (session) {
          scheduleTokenRefresh(session)
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Only redirect if user is on auth/landing pages (not on main app pages)
          const currentPath = window.location.pathname
          const isOnAuthPage = currentPath === '/' || authPaths.includes(currentPath)
          
          // Redirect on sign in events (not initial load, only if on auth pages)
          if (!isInitialLoad && isOnAuthPage) {
            setTimeout(() => checkProfileAndRedirect(session.user), 100)
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear refresh timer on sign out
          if (refreshTimer) clearTimeout(refreshTimer)
          setSession(null)
          setUser(null)
          const currentPath = window.location.pathname
          // Only redirect to login if on protected routes
          if (!authPaths.includes(currentPath) && currentPath !== '/' && currentPath !== '/onboarding') {
            navigate('/login')
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed successfully
          console.log('Token refreshed successfully')
          setSession(session)
          setUser(session?.user ?? null)
          if (session) {
            scheduleTokenRefresh(session)
          }
        } else if (event === 'USER_UPDATED') {
          // User data updated
          setSession(session)
          setUser(session?.user ?? null)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session)
        setUser(session.user)
        setLoading(false)
        
        // Schedule token refresh for existing session
        scheduleTokenRefresh(session)
        
        // Redirect authenticated users away from welcome/auth pages
        // But only on first load, not when app resumes from background
        const currentPath = window.location.pathname
        if (!hasInitialRedirect && (currentPath === '/' || authPaths.includes(currentPath))) {
          sessionStorage.setItem('hasAuthRedirect', 'true')
          setTimeout(() => checkProfileAndRedirect(session.user), 100)
        }
      } else {
        setLoading(false)
        // Redirect unauthenticated users to welcome page if on protected routes
        const currentPath = window.location.pathname
        if (mainAppPaths.some(path => currentPath.startsWith(path)) || currentPath === '/onboarding') {
          navigate('/')
        }
      }
      
      isInitialLoad = false
    })

    return () => {
      subscription.unsubscribe()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [navigate])

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Validate inputs before sending to Supabase
    if (!email || !email.trim()) {
      const error = { message: "Email is required" }
      toast({
        title: "Sign up failed",
        description: "Email is required",
        variant: "destructive",
      })
      return { error }
    }

    if (!password || password.length < 6) {
      const error = { message: "Password must be at least 6 characters" }
      toast({
        title: "Sign up failed",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return { error }
    }

    console.log('Attempting signup with:', { email: email.trim(), hasPassword: !!password, fullName })
    
    try {
      // First attempt to sign up without email confirmation
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName || ''
          }
        }
      })

      console.log('Signup result:', { error, data })

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }

      // If signup successful but no session (email confirmation required),
      // try to sign in immediately
      if (data.user && !data.session) {
        console.log('No session from signup, attempting immediate sign in...')
        const signInResult = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        
        if (signInResult.error) {
          toast({
            title: "Account created",
            description: "Please check your email to confirm your account, then try logging in.",
          })
        } else {
          toast({
            title: "Account created",
            description: "Welcome! Your account has been created successfully.",
          })
          // Handle redirect for successful signup
          setTimeout(() => checkProfileAndRedirect(signInResult.data.user, true), 100)
        }
        return { error: signInResult.error }
      }

      toast({
        title: "Account created",
        description: "Welcome! Your account has been created successfully.",
      })

      // Handle redirect for successful signup with session
      if (data.user) {
        setTimeout(() => checkProfileAndRedirect(data.user, true), 100)
      }

      return { error: null }
    } catch (err: any) {
      console.error('Signup error:', err)
      const error = { message: err.message || "An unexpected error occurred" }
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in with:', { email: email?.trim(), hasPassword: !!password })
    
    if (!email || !email.trim()) {
      const error = { message: "Email is required" }
      toast({
        title: "Login failed",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return { error }
    }

    if (!password) {
      const error = { message: "Password is required" }
      toast({
        title: "Login failed", 
        description: "Please enter your password",
        variant: "destructive",
      })
      return { error }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    console.log('Sign in result:', { error })

    if (error) {
      let errorMessage = error.message
      
      // Handle specific error cases with user-friendly messages
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "The email or password you entered is incorrect. Please check and try again."
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the confirmation link before signing in."
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      })
      
      // Send welcome notification via Telegram (non-blocking)
      supabase.functions.invoke('send-welcome-notification').catch(err => {
        console.error('Failed to send welcome notification:', err)
        // Don't show error to user - this is non-critical
      })
      
      // Login redirects to main feed - no profile check needed
      // The auth state change will handle the redirect
    }

    return { error }
  }

  const signInWithGoogle = async () => {
    // Use production URL for OAuth redirects in deployed environment
    const redirectUrl = window.location.hostname === 'localhost' 
      ? `${window.location.origin}/`
      : `${window.location.protocol}//${window.location.host}/`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })

    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      })
    }

    return { error }
  }

  const resetPassword = async (email: string) => {
    // Use production URL for password reset redirects in deployed environment  
    const redirectUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/reset-password`
      : `${window.location.protocol}//${window.location.host}/reset-password`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link.",
      })
    }

    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      })
      navigate('/feed')
    }

    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      navigate('/login')
    }

    return { error }
  }

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  }
}