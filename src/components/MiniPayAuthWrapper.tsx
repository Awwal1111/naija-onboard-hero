import { ReactNode, useState, createContext, useContext, useCallback, useRef } from 'react'
import { detectMiniPaySync, getMiniPayAccount } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'

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
  hasWalletProvider: boolean
  walletAddress: string | null
  isInitializing: boolean
  userId: string | null
  isRegistered: boolean
  userProfile: MiniPayUserProfile | null
  initializeWallet: () => Promise<boolean>
  refreshUserState: () => Promise<void>
  pendingAction: string | null
  setPendingAction: (action: string | null) => void
}

// SYNC detection at module load - no async, no useEffect
const initialDetection = detectMiniPaySync()

const MiniPayContext = createContext<MiniPayContextType>({
  isMiniPay: initialDetection.isMiniPay,
  hasWalletProvider: initialDetection.hasProvider,
  walletAddress: null,
  isInitializing: false, // NOT true on mount - critical for preventing loops
  userId: null,
  isRegistered: false,
  userProfile: null,
  initializeWallet: async () => false,
  refreshUserState: async () => {},
  pendingAction: null,
  setPendingAction: () => {}
})

export const useMiniPayContext = () => useContext(MiniPayContext)

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

/**
 * MiniPayAuthWrapper - LAZY INITIALIZATION PATTERN
 * 
 * On load: ONLY sync environment detection
 * - NO wallet calls
 * - NO Supabase queries
 * - NO localStorage access
 * - NO auto user creation
 * 
 * Wallet/DB logic is DEFERRED to initializeWallet() 
 * which is called when user takes an action requiring auth.
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  // Use initial sync detection - stable across renders
  const [state, setState] = useState({
    isMiniPay: initialDetection.isMiniPay,
    hasWalletProvider: initialDetection.hasProvider,
    walletAddress: null as string | null,
    isInitializing: false,
    userId: null as string | null,
    isRegistered: false,
    userProfile: null as MiniPayUserProfile | null
  })

  const [pendingAction, setPendingAction] = useState<string | null>(null)
  
  // Track if we've already initialized to prevent double init
  const initializingRef = useRef(false)
  const initializedRef = useRef(false)

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
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: walletUserId,
          minipay_address: walletAddress.toLowerCase(),
          celo_wallet_address: walletAddress.toLowerCase(),
          full_name: null,
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

      return {
        userId: newProfile.user_id,
        fullName: newProfile.full_name,
        avatarUrl: newProfile.profile_picture_url,
        walletBalance: newProfile.wallet_balance || 0,
        email: null,
        profession: newProfile.profession,
        profileCompleted: newProfile.onboarding_completed || false
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error in createWalletUser:', error)
      return null
    }
  }

  /**
   * Check if wallet exists and load/create user
   * Only called from initializeWallet - not on mount!
   */
  const loadOrCreateUser = async (address: string): Promise<void> => {
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
        
        setState(prev => ({
          ...prev,
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
        // Wallet doesn't exist - create new user
        console.log('[MiniPayAuth] Wallet not found, creating new user...')
        
        const newUserProfile = await createWalletUser(address)
        
        if (newUserProfile) {
          setState(prev => ({
            ...prev,
            walletAddress: address,
            isInitializing: false,
            userId: newUserProfile.userId,
            isRegistered: true,
            userProfile: newUserProfile
          }))
        } else {
          // Failed to create user
          setState(prev => ({
            ...prev,
            walletAddress: address,
            isInitializing: false,
            userId: null,
            isRegistered: false,
            userProfile: null
          }))
        }
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error loading user:', error)
      setState(prev => ({
        ...prev,
        walletAddress: address,
        isInitializing: false,
        userId: null,
        isRegistered: false,
        userProfile: null
      }))
    }
  }

  /**
   * LAZY INITIALIZATION - Only call when user action requires auth
   * This is the key to preventing MiniPay reload loops
   */
  const initializeWallet = useCallback(async (): Promise<boolean> => {
    // Already initialized or initializing
    if (initializedRef.current && state.walletAddress) {
      return true
    }
    
    if (initializingRef.current) {
      // Wait for existing initialization
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!initializingRef.current) {
            clearInterval(check)
            resolve(!!state.walletAddress)
          }
        }, 100)
      })
    }

    if (!state.isMiniPay || !state.hasWalletProvider) {
      return false
    }

    initializingRef.current = true
    setState(prev => ({ ...prev, isInitializing: true }))

    try {
      console.log('[MiniPayAuth] Starting lazy wallet initialization...')
      
      // NOW we call the async wallet function
      const address = await getMiniPayAccount()
      console.log('[MiniPayAuth] Got wallet address:', address)

      if (address) {
        await loadOrCreateUser(address)
        initializedRef.current = true
        initializingRef.current = false
        return true
      } else {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          walletAddress: null,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
        initializingRef.current = false
        return false
      }
    } catch (error) {
      console.error('[MiniPayAuth] Wallet initialization error:', error)
      setState(prev => ({
        ...prev,
        isInitializing: false,
        walletAddress: null,
        userId: null,
        isRegistered: false,
        userProfile: null
      }))
      initializingRef.current = false
      return false
    }
  }, [state.isMiniPay, state.hasWalletProvider, state.walletAddress])

  /**
   * Refresh user data from database
   */
  const refreshUserState = useCallback(async () => {
    if (!state.walletAddress) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, wallet_balance, profession, onboarding_completed')
        .or(`celo_wallet_address.ilike.${state.walletAddress.toLowerCase()},minipay_address.ilike.${state.walletAddress.toLowerCase()}`)
        .maybeSingle()

      if (profile) {
        const profileCompleted = !!(profile.full_name && profile.onboarding_completed)
        
        setState(prev => ({
          ...prev,
          userId: profile.user_id,
          isRegistered: true,
          userProfile: {
            userId: profile.user_id,
            fullName: profile.full_name,
            avatarUrl: profile.profile_picture_url,
            walletBalance: profile.wallet_balance || 0,
            email: null,
            profession: profile.profession,
            profileCompleted
          }
        }))
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error refreshing user state:', error)
    }
  }, [state.walletAddress])

  // Build context value with stable references
  const contextValue: MiniPayContextType = {
    ...state,
    initializeWallet,
    refreshUserState,
    pendingAction,
    setPendingAction
  }

  // NO loading screen on mount - app renders immediately
  return (
    <MiniPayContext.Provider value={contextValue}>
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
    hasWalletProvider: context.hasWalletProvider,
    userId: context.userId,
    isRegistered: context.isRegistered,
    userProfile: context.userProfile,
    isInitializing: context.isInitializing,
    initializeWallet: context.initializeWallet,
    refreshUserState: context.refreshUserState,
    pendingAction: context.pendingAction,
    setPendingAction: context.setPendingAction
  }
}