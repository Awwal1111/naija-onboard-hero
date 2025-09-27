import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { toast } = useToast()

  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password']
  const mainAppPaths = ['/feed', '/profile', '/chat', '/earn', '/experts', '/jobs']

  const checkProfileAndRedirect = async (user: any, isSignup: boolean = false) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // Create profile if it doesn't exist (especially during signup)
      if (!profile) {
        await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              full_name: user.user_metadata?.full_name || '',
              phone_number: user.user_metadata?.phone_number || '',
            }
          ])
        
        // New user needs onboarding
        console.log('New user created - redirecting to onboarding')
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
    let isInitialLoad = true
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          // Redirect on sign in events (not initial load)
          if (!isInitialLoad) {
            setTimeout(() => checkProfileAndRedirect(session.user), 100)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          const currentPath = window.location.pathname
          // Only redirect to login if on protected routes, not if on auth pages
          if (!authPaths.includes(currentPath) && currentPath !== '/' && currentPath !== '/onboarding') {
            navigate('/login')
          }
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session)
        setUser(session.user)
        setLoading(false)
        
        // Redirect authenticated users away from welcome/auth pages
        const currentPath = window.location.pathname
        if (currentPath === '/' || authPaths.includes(currentPath)) {
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

    return () => subscription.unsubscribe()
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