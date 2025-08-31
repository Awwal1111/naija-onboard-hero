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

  const checkProfileAndRedirect = async (user: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, state_name, lga_name')
        .eq('user_id', user.id)
        .single()

      // Check if user has completed onboarding (has name, state, lga)
      if (profile && profile.full_name && profile.state_name && profile.lga_name) {
        navigate('/feed')
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        })
      } else {
        // New user or incomplete profile - go to onboarding
        navigate('/onboarding')
        toast({
          title: "Welcome to NaijaLancers!",
          description: "Please complete your profile setup.",
        })
      }
    } catch (error) {
      // Profile doesn't exist or error - go to onboarding
      navigate('/onboarding')
      toast({
        title: "Welcome to NaijaLancers!",
        description: "Please complete your profile setup.",
      })
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          // Check if user has completed onboarding
          checkProfileAndRedirect(session.user)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [navigate, toast])

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
  }
}