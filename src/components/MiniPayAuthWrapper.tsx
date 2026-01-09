import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isMiniPayEnvironment, getMiniPayAccount, hasWalletProvider } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

/**
 * MiniPayAuthWrapper provides wallet-first authentication for MiniPay environment.
 * - In MiniPay: Fetches wallet address automatically (no login required for browsing)
 * - Outside MiniPay: Renders children normally (uses traditional auth)
 * 
 * This follows MiniPay's UX guidelines where:
 * - Users can browse without logging in
 * - Wallet address acts as identifier
 * - Full auth only required for protected actions
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const { user, loading: authLoading } = useAuth()
  const [miniPayState, setMiniPayState] = useState<{
    isMiniPay: boolean
    walletAddress: string | null
    isInitializing: boolean
    error: string | null
  }>({
    isMiniPay: false,
    walletAddress: null,
    isInitializing: true,
    error: null
  })

  useEffect(() => {
    const initMiniPay = async () => {
      // Check if we're in MiniPay environment
      const inMiniPay = isMiniPayEnvironment()
      
      if (!inMiniPay) {
        // Not in MiniPay - let normal auth flow handle things
        setMiniPayState({
          isMiniPay: false,
          walletAddress: null,
          isInitializing: false,
          error: null
        })
        return
      }

      console.log('[MiniPayAuth] MiniPay environment detected')

      // Check for wallet provider
      if (!hasWalletProvider()) {
        console.log('[MiniPayAuth] No wallet provider found')
        setMiniPayState({
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          error: 'Wallet not found'
        })
        return
      }

      try {
        // Get wallet address - in MiniPay this is auto-connected
        const address = await getMiniPayAccount()
        console.log('[MiniPayAuth] Wallet address:', address)

        if (address) {
          // Store wallet address for app use
          setMiniPayState({
            isMiniPay: true,
            walletAddress: address,
            isInitializing: false,
            error: null
          })

          // Check if user exists with this wallet
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('celo_wallet_address', address.toLowerCase())
            .maybeSingle()

          if (existingProfile) {
            console.log('[MiniPayAuth] Found user with wallet:', existingProfile.user_id)
          } else {
            console.log('[MiniPayAuth] New MiniPay user - can browse freely')
          }
        } else {
          setMiniPayState({
            isMiniPay: true,
            walletAddress: null,
            isInitializing: false,
            error: null
          })
        }
      } catch (error) {
        console.error('[MiniPayAuth] Init error:', error)
        setMiniPayState({
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        })
      }
    }

    // Only run once auth loading is done or we're clearly in MiniPay
    if (!authLoading || isMiniPayEnvironment()) {
      initMiniPay()
    }
  }, [authLoading])

  // Show loading only during initial MiniPay wallet detection
  if (miniPayState.isMiniPay && miniPayState.isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    )
  }

  // If there's an error connecting wallet, show it but still allow browsing
  if (miniPayState.isMiniPay && miniPayState.error && !miniPayState.walletAddress) {
    console.log('[MiniPayAuth] Error but allowing browse:', miniPayState.error)
  }

  return <>{children}</>
}

// Export a hook to get MiniPay wallet state in components
export const useMiniPayWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isMiniPay, setIsMiniPay] = useState(false)

  useEffect(() => {
    const check = async () => {
      const inMiniPay = isMiniPayEnvironment()
      setIsMiniPay(inMiniPay)
      
      if (inMiniPay && hasWalletProvider()) {
        const address = await getMiniPayAccount()
        setWalletAddress(address)
      }
    }
    check()
  }, [])

  return { walletAddress, isMiniPay }
}
