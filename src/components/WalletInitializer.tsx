import React, { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const WalletInitializer: React.FC = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const initializeWallet = async () => {
      try {
        // Create wallet if it doesn't exist
        await supabase
          .from('user_wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            escrow_hold: 0
          })
          .select()
          .maybeSingle()
      } catch (error) {
        // Ignore duplicate key errors
        console.log('Wallet initialization:', error)
      }
    }

    initializeWallet()
  }, [user])

  return null
}

export default WalletInitializer