import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPay } from '@/hooks/useMiniPay'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

/**
 * MiniPayAuthWrapper provides wallet-first authentication for MiniPay environment.
 * - In MiniPay: Auto-creates/fetches user session based on wallet address
 * - Outside MiniPay: Renders children normally (uses traditional auth)
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const { user, loading: authLoading } = useAuth()
  const { isMiniPay, isConnected, account, connect } = useMiniPay()
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    // Only auto-connect in MiniPay environment when no user is logged in
    const initMiniPaySession = async () => {
      if (!isMiniPay || user || authLoading || isInitializing) return

      setIsInitializing(true)
      try {
        // Auto-connect to get wallet address
        let walletAddress = account
        if (!isConnected && !walletAddress) {
          const connected = await connect()
          if (!connected) {
            setIsInitializing(false)
            return
          }
          // Wait a moment for account to be set
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Get the current account after connection
        const { getMiniPayAccount } = await import('@/lib/minipay')
        walletAddress = await getMiniPayAccount()

        if (!walletAddress) {
          setIsInitializing(false)
          return
        }

        // Check if a user exists with this wallet address
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('celo_wallet_address', walletAddress.toLowerCase())
          .single()

        if (existingProfile) {
          // User exists, they can sign in normally when they need protected actions
          console.log('[MiniPay] User found with wallet:', walletAddress)
        } else {
          // New MiniPay user - they can browse freely
          console.log('[MiniPay] New user, wallet:', walletAddress)
        }
      } catch (error) {
        console.error('[MiniPay] Auth initialization error:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initMiniPaySession()
  }, [isMiniPay, user, authLoading, isConnected, account, connect, isInitializing])

  // Show loading only during initial MiniPay connection
  if (isMiniPay && isInitializing && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to MiniPay...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
