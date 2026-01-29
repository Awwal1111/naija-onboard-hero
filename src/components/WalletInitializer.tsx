import React, { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC check at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay

/**
 * WalletInitializer - Creates user wallet on first login
 * 
 * CRITICAL: In MiniPay, this component returns null immediately
 * to prevent useAuth() hook from being called
 */
const WalletInitializer: React.FC = () => {
  // CRITICAL: Return null BEFORE any hooks in MiniPay
  if (isMiniPayEnv) {
    return null
  }
  
  return <WalletInitializerInternal />
}

// Internal component that only runs in non-MiniPay environments
const WalletInitializerInternal: React.FC = () => {
  const { user } = useAuth()
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

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