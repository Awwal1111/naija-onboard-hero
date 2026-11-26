import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type UserMode = 'freelancer' | 'client' | 'both'

interface UserModeContextType {
  mode: UserMode
  setMode: (mode: UserMode, persist?: boolean) => Promise<void>
  isFreelancer: boolean
  isClient: boolean
  isLoading: boolean
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined)

const isUserMode = (value: unknown): value is UserMode =>
  value === 'freelancer' || value === 'client' || value === 'both'

export const UserModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<UserMode>(() => {
    const saved = localStorage.getItem('user_mode')
    return isUserMode(saved) ? saved : 'both'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get user ID from auth state changes only (no getSession call to avoid race conditions).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync the saved account mode when the authenticated profile changes.
  useEffect(() => {
    let cancelled = false

    const syncMode = async () => {
      if (!userId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_mode, account_type')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error
        if (!cancelled) {
          // Fall back to the legacy account_type for profiles created before user_mode existed.
          const savedMode = isUserMode(data?.user_mode)
            ? data.user_mode
            : isUserMode(data?.account_type)
              ? data.account_type
              : 'both'
          setModeState(savedMode)
          localStorage.setItem('user_mode', savedMode)
        }
      } catch (error) {
        console.error('Failed to load account mode:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void syncMode()
    return () => { cancelled = true }
  }, [userId])

  const setMode = async (newMode: UserMode, persist = true) => {
    if (!isUserMode(newMode)) throw new Error('Invalid account mode')

    // Persist first so the UI never claims a mode was saved when the database rejected it.
    if (persist && userId) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ user_mode: newMode })
        .eq('user_id', userId)
        .select('user_mode')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('Account mode was not saved to your profile')
    }

    setModeState(newMode)
    localStorage.setItem('user_mode', newMode)
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
