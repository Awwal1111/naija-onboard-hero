import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type UserMode = 'freelancer' | 'client' | 'both'

interface UserModeContextType {
  mode: UserMode
  setMode: (mode: UserMode) => Promise<void>
  isFreelancer: boolean
  isClient: boolean
  isLoading: boolean
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined)

export const UserModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<UserMode>(() => {
    const saved = localStorage.getItem('user_mode') as UserMode
    return saved || 'both'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get user ID from Supabase auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when user is authenticated
  useEffect(() => {
    if (userId) {
      setIsLoading(true)
      supabase
        .from('profiles')
        .select('user_mode')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.user_mode) {
            setModeState(data.user_mode as UserMode)
            localStorage.setItem('user_mode', data.user_mode)
          }
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [userId])

  const setMode = async (newMode: UserMode) => {
    setModeState(newMode)
    localStorage.setItem('user_mode', newMode)
    
    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ user_mode: newMode } as any)
        .eq('user_id', userId)
    }
  }

  const isFreelancer = mode === 'freelancer' || mode === 'both'
  const isClient = mode === 'client' || mode === 'both'

  return (
    <UserModeContext.Provider value={{
      mode,
      setMode,
      isFreelancer,
      isClient,
      isLoading
    }}>
      {children}
    </UserModeContext.Provider>
  )
}

export const useUserMode = () => {
  const context = useContext(UserModeContext)
  if (!context) {
    throw new Error('useUserMode must be used within a UserModeProvider')
  }
  return context
}
