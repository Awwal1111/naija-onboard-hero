import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { isMiniPayEnvironment, getMiniPayAccount, hasWalletProvider } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface MiniPayContextType {
  isMiniPay: boolean
  walletAddress: string | null
  isInitializing: boolean
  userId: string | null
  isRegistered: boolean
}

const MiniPayContext = createContext<MiniPayContextType>({
  isMiniPay: false,
  walletAddress: null,
  isInitializing: true,
  userId: null,
  isRegistered: false
})

export const useMiniPayContext = () => useContext(MiniPayContext)

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
  const [state, setState] = useState<MiniPayContextType>({
    isMiniPay: false,
    walletAddress: null,
    isInitializing: true,
    userId: null,
    isRegistered: false
  })

  useEffect(() => {
    const initMiniPay = async () => {
      // Check if we're in MiniPay environment
      const inMiniPay = isMiniPayEnvironment()
      
      if (!inMiniPay) {
        // Not in MiniPay - let normal auth flow handle things
        setState({
          isMiniPay: false,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false
        })
        return
      }

      console.log('[MiniPayAuth] MiniPay environment detected')

      // Check for wallet provider
      if (!hasWalletProvider()) {
        console.log('[MiniPayAuth] No wallet provider found')
        setState({
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false
        })
        return
      }

      try {
        // Get wallet address - in MiniPay this is auto-connected
        const address = await getMiniPayAccount()
        console.log('[MiniPayAuth] Wallet address:', address)

        if (address) {
          // Check if user exists with this wallet
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, celo_wallet_address')
            .or(`celo_wallet_address.ilike.${address.toLowerCase()},minipay_address.ilike.${address.toLowerCase()}`)
            .maybeSingle()

          if (existingProfile) {
            console.log('[MiniPayAuth] Found registered user:', existingProfile.user_id)
            setState({
              isMiniPay: true,
              walletAddress: address,
              isInitializing: false,
              userId: existingProfile.user_id,
              isRegistered: true
            })
          } else {
            console.log('[MiniPayAuth] New MiniPay user - can browse freely')
            setState({
              isMiniPay: true,
              walletAddress: address,
              isInitializing: false,
              userId: null,
              isRegistered: false
            })
          }
        } else {
          setState({
            isMiniPay: true,
            walletAddress: null,
            isInitializing: false,
            userId: null,
            isRegistered: false
          })
        }
      } catch (error) {
        console.error('[MiniPayAuth] Init error:', error)
        setState({
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false
        })
      }
    }

    // Small delay to ensure window.ethereum is injected
    const timer = setTimeout(initMiniPay, 100)
    return () => clearTimeout(timer)
  }, [])

  // Show loading only during initial MiniPay wallet detection
  if (state.isMiniPay && state.isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <MiniPayContext.Provider value={state}>
      {children}
    </MiniPayContext.Provider>
  )
}

// Export a hook to get MiniPay wallet state in components
export const useMiniPayWallet = () => {
  const context = useContext(MiniPayContext)
  return {
    walletAddress: context.walletAddress,
    isMiniPay: context.isMiniPay,
    userId: context.userId,
    isRegistered: context.isRegistered
  }
}
