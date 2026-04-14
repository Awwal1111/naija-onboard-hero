import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { useIPProtection } from '@/hooks/useIPProtection'
import { useAuthContext } from '@/contexts/AuthContext'
import { useLoginLogger } from '@/hooks/useLoginLogger'

/**
 * useAuth - provides auth state from the centralized AuthProvider
 * plus action methods (signIn, signUp, signOut, etc.)
 * 
 * CRITICAL: Auth state (user, session, loading) comes from AuthContext
 * which has exactly ONE onAuthStateChange subscription for the entire app.
 * This prevents the 14+ duplicate INITIAL_SESSION events that were causing
 * infinite loading and navigation conflicts on refresh.
 */
export const useAuth = () => {
  const { user, session, loading } = useAuthContext()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { checkSignupAllowed, logIPActivity } = useIPProtection()
  const { logLogin, resetLogger } = useLoginLogger()

  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password']

  const checkProfileAndRedirect = useCallback(async (authUser: any, isSignup: boolean = false) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, state_name, lga_name, profession, profile_picture_url, account_type')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (!profile) {
        navigate('/onboarding')
        return
      }
      
      const isOnboardingComplete = profile.full_name && profile.state_name && profile.lga_name
      
      if (isSignup) {
        navigate(isOnboardingComplete ? '/main-feed' : '/onboarding')
        return
      }
      
      navigate(isOnboardingComplete ? '/main-feed' : '/onboarding')
    } catch (error) {
      console.error('Error checking profile:', error)
      navigate('/onboarding')
    }
  }, [navigate])

  // Handle initial redirect when user lands on auth pages while logged in
  const handleInitialRedirect = useCallback(() => {
    if (!user) return
    const currentPath = window.location.pathname
    const hasInitialRedirect = sessionStorage.getItem('hasAuthRedirect') === 'true'
    if (!hasInitialRedirect && (currentPath === '/' || authPaths.includes(currentPath))) {
      sessionStorage.setItem('hasAuthRedirect', 'true')
      checkProfileAndRedirect(user)
    }
  }, [user, checkProfileAndRedirect])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const ipCheck = await checkSignupAllowed()
    if (!ipCheck.allowed) {
      const error = { message: ipCheck.message || "Too many signups from your network. Please try again later." }
      toast({ title: "Sign up blocked", description: error.message, variant: "destructive" })
      return { error }
    }

    if (!email || !email.trim()) {
      const error = { message: "Email is required" }
      toast({ title: "Sign up failed", description: "Email is required", variant: "destructive" })
      return { error }
    }

    if (!password || password.length < 6) {
      const error = { message: "Password must be at least 6 characters" }
      toast({ title: "Sign up failed", description: "Password must be at least 6 characters", variant: "destructive" })
      return { error }
    }
    
    try {
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName || '' } }
      })

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" })
        return { error }
      }

      if (data.user && !data.session) {
        const signInResult = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInResult.error) {
          toast({ title: "Account created", description: "Please check your email to confirm your account, then try logging in." })
        } else {
          toast({ title: "Account created", description: "Welcome! Your account has been created successfully." })
          logIPActivity(signInResult.data.user.id, 'signup')
          setTimeout(() => checkProfileAndRedirect(signInResult.data.user, true), 100)
        }
        return { error: signInResult.error }
      }

      toast({ title: "Account created", description: "Welcome! Your account has been created successfully." })
      if (data.user) {
        logIPActivity(data.user.id, 'signup')
        setTimeout(() => checkProfileAndRedirect(data.user, true), 100)
      }
      return { error: null }
    } catch (err: any) {
      const error = { message: err.message || "An unexpected error occurred" }
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" })
      return { error }
    }
  }, [checkSignupAllowed, logIPActivity, checkProfileAndRedirect, toast])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email || !email.trim()) {
      const error = { message: "Email is required" }
      toast({ title: "Login failed", description: "Please enter your email address", variant: "destructive" })
      return { error }
    }
    if (!password) {
      const error = { message: "Password is required" }
      toast({ title: "Login failed", description: "Please enter your password", variant: "destructive" })
      return { error }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (error) {
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "The email or password you entered is incorrect. Please check and try again."
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the confirmation link before signing in."
      }
      toast({ title: "Login failed", description: errorMessage, variant: "destructive" })
    } else {
      toast({ title: "Welcome back!", description: "You've been signed in successfully." })
      // Fire and forget - non-blocking
      logLogin('email')
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          logIPActivity(data.user.id, 'login')
          // Explicit navigation after login (don't rely solely on React re-render)
          setTimeout(() => checkProfileAndRedirect(data.user), 100)
        }
      })
    }
    return { error }
  }, [logIPActivity, logLogin, toast, checkProfileAndRedirect])

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/`
      : `${window.location.protocol}//${window.location.host}/`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    })
    if (error) {
      toast({ title: "Google sign in failed", description: error.message, variant: "destructive" })
    }
    return { error }
  }, [toast])

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/reset-password`
      : `${window.location.protocol}//${window.location.host}/reset-password`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
    if (error) {
      toast({ title: "Password reset failed", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Password reset email sent", description: "Check your email for the password reset link." })
    }
    return { error }
  }, [toast])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast({ title: "Password update failed", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Password updated", description: "Your password has been successfully updated." })
      navigate('/feed')
    }
    return { error }
  }, [toast, navigate])

  const signOut = useCallback(async () => {
    sessionStorage.removeItem('hasAuthRedirect')
    resetLogger()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({ title: "Sign out failed", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Signed out", description: "You have been successfully signed out." })
      navigate('/login')
    }
    return { error }
  }, [toast, navigate])

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
    handleInitialRedirect,
  }
}
