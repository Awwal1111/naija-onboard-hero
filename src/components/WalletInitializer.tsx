import React, { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const WalletInitializer: React.FC = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const initializeWallet = async () => {
      try {
        // Check if wallet already exists
        const { data: existingWallet } = await supabase
          .from('user_wallets')
          .select('user_id')
          .eq('user_id', user.id)
          .single()

        if (!existingWallet) {
          // Create wallet if it doesn't exist
          await supabase
            .from('user_wallets')
            .insert({
              user_id: user.id,
              balance: 0,
              escrow_hold: 0
            })
        }
      } catch (error) {
        // Ignore duplicate key errors and other RLS errors
        console.log('Wallet initialization:', error)
      }
    }

    initializeWallet()
  }, [user])

  return null
}

export default WalletInitializer