import React, { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { detectMiniPaySync } from '@/lib/minipay'

// Keep MiniPay outside this initializer; MiniPay manages its connected wallet.
const isMiniPayEnv = detectMiniPaySync().isMiniPay

const WalletInitializer: React.FC = () => {
  if (isMiniPayEnv) return null
  return <WalletInitializerInternal />
}

const WalletInitializerInternal: React.FC = () => {
  const { user } = useAuth()
  const initializedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user || initializedUserRef.current === user.id) return
    initializedUserRef.current = user.id

    const initializeWallet = async () => {
      try {
        const [{ data: profile, error: profileError }, { data: existingWallet, error: walletReadError }] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('celo_wallet_address')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('user_wallets')
              .select('user_id')
              .eq('user_id', user.id)
              .maybeSingle(),
          ])

        if (profileError) throw profileError
        if (walletReadError) throw walletReadError

        if (!existingWallet) {
          const { error } = await supabase
            .from('user_wallets')
            .upsert({ user_id: user.id, balance: 0, escrow_hold: 0 }, { onConflict: 'user_id', ignoreDuplicates: true })
          if (error) throw error
        }

        // Do not attempt to replace an address already present in the profile.
        // The Edge Function's atomic RPC also protects against concurrent calls.
        if (!profile?.celo_wallet_address) {
          const { data, error } = await supabase.functions.invoke('create-user-wallet')
          if (error) throw error
          if (!data?.success || !data?.address) {
            throw new Error(data?.error || 'Celo wallet provisioning did not complete')
          }
        }
      } catch (error) {
        // Keep signup/login available; surface a clear diagnostic for retry/monitoring.
        console.error('[WalletInitializer] Wallet initialization needs attention:', error)
        initializedUserRef.current = null
      }
    }

    void initializeWallet()
  }, [user])

  return null
}

export default WalletInitializer
