import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'

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
  // Use the app's single auth source of truth. A separate auth subscription here
  // can miss the initial session and leave userId null, causing saves to update
  // localStorage only while appearing successful.
  const { user } = useAuthContext()
  const userId = user?.id ?? null

  const [mode, setModeState] = useState<UserMode>(() => {
    const saved = localStorage.getItem('user_mode')
    return isUserMode(saved) ? saved : 'both'
  })
  const [isLoading, setIsLoading] = useState(true)

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
          .select('user_mode')
          .eq('user_id', userId)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Your profile could not be found')
        if (!cancelled) {
          const savedMode = isUserMode(data.user_mode) ? data.user_mode : 'both'
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
    if (persist) {
      if (!userId) throw new Error('You must be signed in to save your account mode')
      const { data, error } = await supabase
        .from('profiles')
        .update({ user_mode: newMode })
        .eq('user_id', userId)
        .select('user_mode')
        .maybeSingle()
      if (error) {
        console.error('Database rejected account mode update:', error)
        throw error
      }
      if (!data || data.user_mode !== newMode) {
        throw new Error('Account mode was not confirmed as saved')
      }
    }
    setModeState(newMode)
    localStorage.setItem('user_mode', newMode)
  }

  const isFreelancer = mode === 'freelancer' || mode === 'both'
  const isClient = mode === 'client' || mode === 'both'
  return (
    <UserModeContext.Provider value={{ mode, setMode, isFreelancer, isClient, isLoading }}>
      {children}
    </UserModeContext.Provider>
  )
}

export const useUserMode = () => {
  const context = useContext(UserModeContext)
  if (!context) throw new Error('useUserMode must be used within a UserModeProvider')
  return context
}
