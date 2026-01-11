import { ReactNode, useEffect, useState, createContext, useContext, useCallback } from 'react'
import { isMiniPayEnvironment, getMiniPayAccount, hasWalletProvider } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface MiniPayUserProfile {
  userId: string
  fullName: string | null
  avatarUrl: string | null
  walletBalance: number
  email: string | null
  profession: string | null
  profileCompleted: boolean
}

interface MiniPayContextType {
  isMiniPay: boolean
  walletAddress: string | null
  isInitializing: boolean
  userId: string | null
  isRegistered: boolean
  userProfile: MiniPayUserProfile | null
  refreshUserState: () => Promise<void>
  pendingAction: string | null
  setPendingAction: (action: string | null) => void
}

const MiniPayContext = createContext<MiniPayContextType>({
  isMiniPay: false,
  walletAddress: null,
  isInitializing: true,
  userId: null,
  isRegistered: false,
  userProfile: null,
  refreshUserState: async () => {},
  pendingAction: null,
  setPendingAction: () => {}
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
  odUserId: string
  fullName: string | null
  avatarUrl: string | null
  profileCompleted: boolean
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
 * 
 * KEY PRINCIPLE: In MiniPay, wallet = identity
 * - No login/signup screens needed
 * - User is auto-created when wallet connects
 * - Profile completion is separate from authentication
 * 
 * Flow:
 * 1. Detect MiniPay environment
 * 2. Get wallet address automatically
 * 3. Check if wallet exists in profiles table
 * 4. If not exists: Create new user record (minimal data)
 * 5. If exists: Auto-authenticate and restore session
 * 6. Profile completion happens separately when user takes action
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const [state, setState] = useState<MiniPayContextType>({
    isMiniPay: false,
    walletAddress: null,
    isInitializing: true,
    userId: null,
    isRegistered: false,
    userProfile: null,
    refreshUserState: async () => {},
    pendingAction: null,
    setPendingAction: () => {}
  })

  const [pendingAction, setPendingAction] = useState<string | null>(null)

  /**
   * Create a new user record with just wallet address
   * This is the wallet-first approach - user exists with minimal data
   */
  const createWalletUser = async (walletAddress: string): Promise<MiniPayUserProfile | null> => {
    try {
      console.log('[MiniPayAuth] Creating new wallet-based user for:', walletAddress)
      
      // Generate a unique user ID for this wallet user
      const walletUserId = `minipay_${walletAddress.toLowerCase().slice(2, 14)}_${Date.now().toString(36)}`
      
      // Create minimal profile record
      // Note: We're using the wallet address as part of the user_id for MiniPay users
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: walletUserId,
          minipay_address: walletAddress.toLowerCase(),
          celo_wallet_address: walletAddress.toLowerCase(),
          full_name: null, // Will be set during profile completion
          profession: null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('user_id, full_name, profile_picture_url, wallet_balance, profession, onboarding_completed')
        .single()

      if (error) {
        console.error('[MiniPayAuth] Error creating wallet user:', error)
        return null
      }

      console.log('[MiniPayAuth] Created new wallet user:', newProfile.user_id)

      const userProfile: MiniPayUserProfile = {
        userId: newProfile.user_id,
        fullName: newProfile.full_name,
        avatarUrl: newProfile.profile_picture_url,
        walletBalance: newProfile.wallet_balance || 0,
        email: null,
        profession: newProfile.profession,
        profileCompleted: newProfile.onboarding_completed || false
      }

      // Cache the new user
      setCachedUser({
        walletAddress: walletAddress.toLowerCase(),
        odUserId: newProfile.user_id,
        fullName: null,
        avatarUrl: null,
        profileCompleted: false
      })

      return userProfile
    } catch (error) {
      console.error('[MiniPayAuth] Error in createWalletUser:', error)
      return null
    }
  }

  /**
   * Check if wallet exists and load/create user
   */
  const initializeWalletUser = useCallback(async (address: string) => {
    // First check cache for faster recognition
    const cached = getCachedUser()
    if (cached && cached.walletAddress.toLowerCase() === address.toLowerCase()) {
      console.log('[MiniPayAuth] Found cached user:', cached.odUserId)
      
      // Return cached data immediately, but verify in background
      setState(prev => ({
        ...prev,
        isMiniPay: true,
        walletAddress: address,
        isInitializing: false,
        userId: cached.odUserId,
        isRegistered: true,
        userProfile: {
          userId: cached.odUserId,
          fullName: cached.fullName,
          avatarUrl: cached.avatarUrl,
          walletBalance: 0,
          email: null,
          profession: null,
          profileCompleted: cached.profileCompleted
        }
      }))
      
      // Verify and refresh in background
      verifyAndRefreshUser(address, cached.odUserId)
      return
    }
    
    // No cache - check database
    await verifyAndRefreshUser(address, null)
  }, [])

  const verifyAndRefreshUser = async (address: string, cachedUserId: string | null) => {
    try {
      // Check if wallet already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, wallet_balance, profession, onboarding_completed')
        .or(`celo_wallet_address.ilike.${address.toLowerCase()},minipay_address.ilike.${address.toLowerCase()}`)
        .maybeSingle()

      if (existingProfile) {
        console.log('[MiniPayAuth] Found existing wallet user:', existingProfile.user_id)
        
        const profileCompleted = !!(existingProfile.full_name && existingProfile.onboarding_completed)
        
        // Update cache
        setCachedUser({
          walletAddress: address.toLowerCase(),
          odUserId: existingProfile.user_id,
          fullName: existingProfile.full_name,
          avatarUrl: existingProfile.profile_picture_url,
          profileCompleted
        })
        
        setState(prev => ({
          ...prev,
          isMiniPay: true,
          walletAddress: address,
          isInitializing: false,
          userId: existingProfile.user_id,
          isRegistered: true,
          userProfile: {
            userId: existingProfile.user_id,
            fullName: existingProfile.full_name,
            avatarUrl: existingProfile.profile_picture_url,
            walletBalance: existingProfile.wallet_balance || 0,
            email: null,
            profession: existingProfile.profession,
            profileCompleted
          }
        }))
      } else {
        // Wallet doesn't exist - CREATE NEW USER automatically
        console.log('[MiniPayAuth] Wallet not found, creating new user...')
        
        // Clear any stale cache
        if (cachedUserId) {
          clearCachedUser()
        }
        
        const newUserProfile = await createWalletUser(address)
        
        if (newUserProfile) {
          setState(prev => ({
            ...prev,
            isMiniPay: true,
            walletAddress: address,
            isInitializing: false,
            userId: newUserProfile.userId,
            isRegistered: true, // User is now registered (with wallet)
            userProfile: newUserProfile
          }))
        } else {
          // Failed to create user - allow browsing but not registered
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
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error verifying user:', error)
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
          // Initialize or create wallet user
          await initializeWalletUser(address)
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
  }, [initializeWalletUser])

  // Update refreshUserState and setPendingAction in context whenever they change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      refreshUserState,
      setPendingAction,
      pendingAction
    }))
  }, [refreshUserState, pendingAction])

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
    refreshUserState: context.refreshUserState,
    pendingAction: context.pendingAction,
    setPendingAction: context.setPendingAction
  }
}
