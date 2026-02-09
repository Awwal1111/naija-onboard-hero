import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface UserSecrets {
  transaction_pin: string | null
}

export const useUserSecrets = () => {
  const { user } = useAuth()
  const [secrets, setSecrets] = useState<UserSecrets | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSecrets = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_secrets')
        .select('transaction_pin')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user secrets:', error)
      }

      setSecrets(data || null)
    } catch (error) {
      console.error('Error fetching user secrets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchSecrets()
    } else {
      setLoading(false)
    }
  }, [user])

  return {
    secrets,
    loading,
    hasPin: Boolean(secrets?.transaction_pin),
    transactionPin: secrets?.transaction_pin || null,
    refetch: fetchSecrets
  }
}
