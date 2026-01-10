import { ReactNode, useEffect, useState, createContext, useContext, useCallback } from 'react'
import { isMiniPayEnvironment, getMiniPayAccount, hasWalletProvider } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface MiniPayContextType {
  isMiniPay: boolean
  walletAddress: string | null
  isInitializing: boolean
  userId: string | null
  isRegistered: boolean
  userProfile: {
    fullName: string | null
    avatarUrl: string | null
    walletBalance: number
  } | null
  refreshUserState: () => Promise<void>
}

const MiniPayContext = createContext<MiniPayContextType>({
  isMiniPay: false,
  walletAddress: null,
  isInitializing: true,
  userId: null,
  isRegistered: false,
  userProfile: null,
  refreshUserState: async () => {}
})

export const useMiniPayContext = () => useContext(MiniPayContext)

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

// Cache key for MiniPay user data
const MINIPAY_CACHE_KEY = 'minipay_user_cache'
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CachedMiniPayUser {
  walletAddress: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  cachedAt: number
}

const getCachedUser = (): CachedMiniPayUser | null => {
  try {
    const cached = localStorage.getItem(MINIPAY_CACHE_KEY)
    if (!cached) return null
    
    const data: CachedMiniPayUser = JSON.parse(cached)
    // Check if cache is still valid
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      localStorage.removeItem(MINIPAY_CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

const setCachedUser = (user: Omit<CachedMiniPayUser, 'cachedAt'>) => {
  try {
    localStorage.setItem(MINIPAY_CACHE_KEY, JSON.stringify({
      ...user,
      cachedAt: Date.now()
    }))
  } catch {
    // Ignore storage errors
  }
}

const clearCachedUser = () => {
  try {
    localStorage.removeItem(MINIPAY_CACHE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * MiniPayAuthWrapper provides wallet-first authentication for MiniPay environment.
 * - In MiniPay: Fetches wallet address automatically (no login required for browsing)
 * - Outside MiniPay: Renders children normally (uses traditional auth)
 * - SMART: Remembers registered users and auto-authenticates them
 * 
 * This follows MiniPay's UX guidelines where:
 * - Users can browse without logging in
 * - Wallet address acts as identifier
 * - Registered users are automatically recognized
 * - Full auth only required for protected actions (for new users)
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const [state, setState] = useState<MiniPayContextType>({
    isMiniPay: false,
    walletAddress: null,
    isInitializing: true,
    userId: null,
    isRegistered: false,
    userProfile: null,
    refreshUserState: async () => {}
  })

  const checkUserRegistration = useCallback(async (address: string) => {
    // First check cache for faster recognition
    const cached = getCachedUser()
    if (cached && cached.walletAddress.toLowerCase() === address.toLowerCase()) {
      console.log('[MiniPayAuth] Found cached user:', cached.userId)
      
      // Return cached data immediately, but verify in background
      setState(prev => ({
        ...prev,
        isMiniPay: true,
        walletAddress: address,
        isInitializing: false,
        userId: cached.userId,
        isRegistered: true,
        userProfile: {
          fullName: cached.fullName,
          avatarUrl: cached.avatarUrl,
          walletBalance: 0
        }
      }))
      
      // Verify and refresh in background
      verifyAndRefreshUser(address, cached.userId)
      return
    }
    
    // No cache - check database
    await verifyAndRefreshUser(address, null)
  }, [])

  const verifyAndRefreshUser = async (address: string, cachedUserId: string | null) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, celo_wallet_address, wallet_balance')
        .or(`celo_wallet_address.ilike.${address.toLowerCase()},minipay_address.ilike.${address.toLowerCase()}`)
        .maybeSingle()

      if (existingProfile) {
        console.log('[MiniPayAuth] Verified registered user:', existingProfile.user_id)
        
        // Update cache
        setCachedUser({
          walletAddress: address,
          userId: existingProfile.user_id,
          fullName: existingProfile.full_name,
          avatarUrl: existingProfile.profile_picture_url
        })
        
        setState(prev => ({
          ...prev,
          isMiniPay: true,
          walletAddress: address,
          isInitializing: false,
          userId: existingProfile.user_id,
          isRegistered: true,
          userProfile: {
            fullName: existingProfile.full_name,
            avatarUrl: existingProfile.profile_picture_url,
            walletBalance: existingProfile.wallet_balance || 0
          }
        }))
      } else {
        // User not found - clear cache if it existed
        if (cachedUserId) {
          console.log('[MiniPayAuth] Cached user no longer exists, clearing cache')
          clearCachedUser()
        }
        
        console.log('[MiniPayAuth] New MiniPay user - can browse freely')
        setState(prev => ({
          ...prev,
          isMiniPay: true,
          walletAddress: address,
          isInitializing: false,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error verifying user:', error)
      // On error, keep previous state but mark as not initializing
      setState(prev => ({
        ...prev,
        isInitializing: false
      }))
    }
  }

  const refreshUserState = useCallback(async () => {
    if (!state.walletAddress) return
    await verifyAndRefreshUser(state.walletAddress, state.userId)
  }, [state.walletAddress, state.userId])

  useEffect(() => {
    const initMiniPay = async () => {
      // Check if we're in MiniPay environment
      const inMiniPay = isMiniPayEnvironment()
      
      if (!inMiniPay) {
        // Not in MiniPay - let normal auth flow handle things
        setState(prev => ({
          ...prev,
          isMiniPay: false,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
        return
      }

      console.log('[MiniPayAuth] MiniPay environment detected')

      // Check for wallet provider
      if (!hasWalletProvider()) {
        console.log('[MiniPayAuth] No wallet provider found')
        setState(prev => ({
          ...prev,
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
        return
      }

      try {
        // Get wallet address - in MiniPay this is auto-connected
        const address = await getMiniPayAccount()
        console.log('[MiniPayAuth] Wallet address:', address)

        if (address) {
          // Check registration status (uses cache for speed)
          await checkUserRegistration(address)
        } else {
          setState(prev => ({
            ...prev,
            isMiniPay: true,
            walletAddress: null,
            isInitializing: false,
            userId: null,
            isRegistered: false,
            userProfile: null
          }))
        }
      } catch (error) {
        console.error('[MiniPayAuth] Init error:', error)
        setState(prev => ({
          ...prev,
          isMiniPay: true,
          walletAddress: null,
          isInitializing: false,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
      }
    }

    // Small delay to ensure window.ethereum is injected
    const timer = setTimeout(initMiniPay, 100)
    return () => clearTimeout(timer)
  }, [checkUserRegistration])

  // Update refreshUserState in context whenever it changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      refreshUserState
    }))
  }, [refreshUserState])

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
    isRegistered: context.isRegistered,
    userProfile: context.userProfile,
    refreshUserState: context.refreshUserState
  }
}
