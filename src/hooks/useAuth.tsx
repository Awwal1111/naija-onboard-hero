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

  const checkProfileAndRedirect = async (user: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // Don't redirect if user is already on a main app page
      const currentPath = window.location.pathname
      
      if (profile && profile.full_name) {
        // User has completed profile setup
        if (!mainAppPaths.some(path => currentPath.startsWith(path)) && 
            !authPaths.includes(currentPath) && 
            currentPath !== '/') {
          navigate('/feed')
        }
      } else {
        // User needs onboarding
        if (currentPath !== '/onboarding' && 
            !authPaths.includes(currentPath) && 
            currentPath !== '/') {
          navigate('/onboarding')
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      // Only redirect on actual errors, not missing profiles
      const currentPath = window.location.pathname
      if (currentPath !== '/onboarding' && 
          !authPaths.includes(currentPath) && 
          currentPath !== '/') {
        navigate('/onboarding')
      }
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
          // Always redirect on sign in events (not initial load)
          if (!isInitialLoad) {
            setTimeout(() => checkProfileAndRedirect(session.user), 100)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          const currentPath = window.location.pathname
          if (!authPaths.includes(currentPath)) {
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
        
        // Check if we need to redirect on initial load
        const currentPath = window.location.pathname
        if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup') {
          setTimeout(() => checkProfileAndRedirect(session.user), 100)
        }
      } else {
        setLoading(false)
      }
      
      isInitialLoad = false
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    })

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link.",
      })
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      })
    }

    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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