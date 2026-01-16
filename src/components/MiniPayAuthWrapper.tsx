import { ReactNode, useState, createContext, useContext, useCallback, useRef, useEffect } from 'react'
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
 * Get wallet address SILENTLY - no popup, no user action needed
 * MiniPay auto-injects the wallet, so eth_accounts returns immediately
 */
const getSilentWalletAddress = async (): Promise<string | null> => {
  if (typeof window === 'undefined' || !window.ethereum) return null
  
  try {
    // eth_accounts is READ-ONLY - no popup, no user approval needed
    // In MiniPay, wallet is auto-connected so this returns the address
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    }) as string[]
    
    return accounts[0] || null
  } catch (error) {
    console.error('[MiniPayAuth] Silent wallet check failed:', error)
    return null
  }
}

/**
 * MiniPayAuthWrapper - SILENT REHYDRATION PATTERN
 * 
 * On load (MiniPay only):
 * - Get wallet address silently (NO popup - eth_accounts)
 * - Query profile by wallet address
 * - Restore user state with SINGLE setState
 * 
 * Rules:
 * - Runs ONCE
 * - No loading screen
 * - No Supabase Auth
 * - No presence
 * - No polling/retries/timers
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
  
  // Track if we've already rehydrated/initialized to prevent double runs
  const hasRehydratedRef = useRef(false)
  const initializingRef = useRef(false)
  const initializedRef = useRef(false)

  /**
   * SILENT REHYDRATION - runs ONCE on mount in MiniPay
   * Gets wallet address passively and loads user from DB
   * NO loading state shown - completely invisible to user
   */
  useEffect(() => {
    // Only run in MiniPay with wallet provider
    if (!initialDetection.isMiniPay || !initialDetection.hasProvider) return
    
    // Only run once
    if (hasRehydratedRef.current) return
    hasRehydratedRef.current = true

    const silentRehydrate = async () => {
      try {
        console.log('[MiniPayAuth] Starting silent rehydration...')
        
        // Get wallet address SILENTLY (no popup)
        const address = await getSilentWalletAddress()
        
        if (!address) {
          console.log('[MiniPayAuth] No wallet address found silently')
          return // No state change needed - user will trigger init manually
        }

        console.log('[MiniPayAuth] Silent wallet found:', address)

        // Build complete state in local variables
        let nextState = {
          walletAddress: address,
          isInitializing: false,
          userId: null as string | null,
          isRegistered: false,
          userProfile: null as MiniPayUserProfile | null
        }

        // Query profile by wallet address
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url, wallet_balance, profession, onboarding_completed')
          .or(`celo_wallet_address.ilike.${address.toLowerCase()},minipay_address.ilike.${address.toLowerCase()}`)
          .maybeSingle()

        if (existingProfile) {
          console.log('[MiniPayAuth] Found existing user:', existingProfile.user_id)
          
          const profileCompleted = !!(existingProfile.full_name && existingProfile.onboarding_completed)
          
          nextState = {
            ...nextState,
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
          }
          
          // Mark as initialized since we found the user
          initializedRef.current = true
        } else {
          // ✅ FIX: CREATE USER IMMEDIATELY instead of waiting
          console.log('[MiniPayAuth] No profile found - CREATING user now...')
          
          const walletUserId = `minipay_${address.toLowerCase().slice(2, 14)}_${Date.now().toString(36)}`
          
          const { data: newProfile, error } = await supabase
            .from('profiles')
            .insert({
              user_id: walletUserId,
              minipay_address: address.toLowerCase(),
              celo_wallet_address: address.toLowerCase(),
              full_name: null,
              profession: null,
              onboarding_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('user_id, full_name, profile_picture_url, wallet_balance, profession, onboarding_completed')
            .single()

          if (!error && newProfile) {
            console.log('[MiniPayAuth] Created new user:', newProfile.user_id)
            
            nextState = {
              ...nextState,
              userId: newProfile.user_id,
              isRegistered: true, // ✅ IMMEDIATELY REGISTERED
              userProfile: {
                userId: newProfile.user_id,
                fullName: null,
                avatarUrl: null,
                walletBalance: 0,
                email: null,
                profession: null,
                profileCompleted: false
              }
            }
            
            initializedRef.current = true
          } else {
            console.error('[MiniPayAuth] Failed to create user:', error)
            // Still store wallet address so user can retry
            nextState.walletAddress = address
          }
        }

        // ✅ SINGLE setState call - prevents flickering
        setState(prev => ({ ...prev, ...nextState }))
        
      } catch (error) {
        console.error('[MiniPayAuth] Silent rehydration error:', error)
        // No state change on error - app still works, user can trigger init manually
      }
    }

    // Run immediately but don't block render
    silentRehydrate()
  }, []) // Empty deps - runs ONCE

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
   * 
   * CRITICAL: This function calls setState() exactly ONCE to prevent
   * MiniPay WebView flickering from multiple re-renders.
   */
  const loadOrCreateUser = async (address: string): Promise<void> => {
    // Build complete next state in local variables - NO setState until the end
    let nextState = {
      walletAddress: address,
      isInitializing: false,
      userId: null as string | null,
      isRegistered: false,
      userProfile: null as MiniPayUserProfile | null
    }

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
        
        // Update local state object - NOT calling setState yet
        nextState = {
          ...nextState,
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
        }
      } else {
        // Wallet doesn't exist - create new user
        console.log('[MiniPayAuth] Wallet not found, creating new user...')
        
        const newUserProfile = await createWalletUser(address)
        
        if (newUserProfile) {
          // Update local state object - NOT calling setState yet
          nextState = {
            ...nextState,
            userId: newUserProfile.userId,
            isRegistered: true,
            userProfile: newUserProfile
          }
        }
        // If createWalletUser fails, nextState already has defaults (null, false, null)
      }
    } catch (error) {
      console.error('[MiniPayAuth] Error loading user:', error)
      // nextState already has error-safe defaults
    }

    // ✅ SINGLE setState call - prevents MiniPay flickering
    setState(prev => ({ ...prev, ...nextState }))
  }

  /**
   * LAZY INITIALIZATION - Only call when user action requires auth
   * This is the key to preventing MiniPay reload loops
   * 
   * CRITICAL: Minimizes setState calls to prevent MiniPay WebView flickering.
   * Uses refs for synchronization instead of state where possible.
   */
  const initializeWallet = useCallback(async (): Promise<boolean> => {
    // Already initialized - no state changes needed
    if (initializedRef.current && state.walletAddress) {
      return true
    }
    
    // Already initializing - wait without triggering new state
    if (initializingRef.current) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!initializingRef.current) {
            clearInterval(check)
            resolve(initializedRef.current)
          }
        }, 100)
      })
    }

    // Not in MiniPay - no state changes needed
    if (!state.isMiniPay || !state.hasWalletProvider) {
      return false
    }

    // Mark as initializing using ref (no re-render)
    initializingRef.current = true
    
    // Single setState to show loading - this is unavoidable but controlled
    setState(prev => ({ ...prev, isInitializing: true }))

    let success = false

    try {
      console.log('[MiniPayAuth] Starting lazy wallet initialization...')
      
      const address = await getMiniPayAccount()
      console.log('[MiniPayAuth] Got wallet address:', address)

      if (address) {
        // loadOrCreateUser handles its own single setState
        await loadOrCreateUser(address)
        initializedRef.current = true
        success = true
      } else {
        // No address - build error state and set once
        setState(prev => ({
          ...prev,
          isInitializing: false,
          walletAddress: null,
          userId: null,
          isRegistered: false,
          userProfile: null
        }))
      }
    } catch (error) {
      console.error('[MiniPayAuth] Wallet initialization error:', error)
      // Error - build error state and set once
      setState(prev => ({
        ...prev,
        isInitializing: false,
        walletAddress: null,
        userId: null,
        isRegistered: false,
        userProfile: null
      }))
    }

    initializingRef.current = false
    return success
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