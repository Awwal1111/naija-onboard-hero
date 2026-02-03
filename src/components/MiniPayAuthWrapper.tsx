import { ReactNode, createContext, useContext, useCallback, useState, useEffect, useRef } from 'react'
import { detectMiniPaySync, getMiniPayAccount, connectMiniPay, getMiniPayCUSDBalance, getMiniPayUSDTBalance } from '@/lib/minipay'

interface MiniPayContextType {
  isMiniPay: boolean
  hasWalletProvider: boolean
  walletAddress: string | null
  cusdBalance: string
  usdtBalance: string
  isConnecting: boolean
  isAutoConnected: boolean
  connectWallet: () => Promise<string | null>
  refreshBalances: () => Promise<void>
}

// SYNC detection at module load - no async
const initialDetection = detectMiniPaySync()

const MiniPayContext = createContext<MiniPayContextType>({
  isMiniPay: initialDetection.isMiniPay,
  hasWalletProvider: initialDetection.hasProvider,
  walletAddress: null,
  cusdBalance: '0',
  usdtBalance: '0',
  isConnecting: false,
  isAutoConnected: false,
  connectWallet: async () => null,
  refreshBalances: async () => {}
})

export const useMiniPayContext = () => useContext(MiniPayContext)

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

/**
 * MiniPayAuthWrapper - Auto-connects wallet on page load per MiniPay docs
 * 
 * CRITICAL: Per MiniPay documentation:
 * - "Never show a connect button in Mini Apps"
 * - "Connection should happen automatically on page load"
 * 
 * This wrapper auto-connects the injected wallet when in MiniPay environment.
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [cusdBalance, setCusdBalance] = useState('0')
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAutoConnected, setIsAutoConnected] = useState(false)
  
  // Prevent double initialization
  const initRef = useRef(false)

  /**
   * Connect wallet - can be called manually or auto on page load
   */
  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (walletAddress) return walletAddress
    if (!initialDetection.hasProvider) return null

    setIsConnecting(true)
    
    try {
      // First try to get existing account (MiniPay may auto-expose)
      let address = await getMiniPayAccount()
      
      // If no account, explicitly request connection
      if (!address && initialDetection.isMiniPay) {
        address = await connectMiniPay()
      }
      
      if (address) {
        // Fetch balances in parallel
        const [cusd, usdt] = await Promise.all([
          getMiniPayCUSDBalance(address).catch(() => '0'),
          getMiniPayUSDTBalance(address).catch(() => '0')
        ])
        
        setWalletAddress(address)
        setCusdBalance(parseFloat(cusd).toFixed(2))
        setUsdtBalance(parseFloat(usdt).toFixed(2))
        
        console.log('[MiniPay] Connected:', address)
        return address
      }
      
      return null
    } catch (error) {
      console.error('[MiniPay] Connect failed:', error)
      return null
    } finally {
      setIsConnecting(false)
    }
  }, [walletAddress])

  /**
   * AUTO-CONNECT on page load (per MiniPay documentation)
   * "Connection should happen automatically on page load"
   */
  useEffect(() => {
    // Only auto-connect in MiniPay environment
    if (!initialDetection.isMiniPay) return
    if (!initialDetection.hasProvider) return
    if (initRef.current) return
    
    initRef.current = true
    
    const autoConnect = async () => {
      console.log('[MiniPay] Auto-connecting on page load...')
      const address = await connectWallet()
      if (address) {
        setIsAutoConnected(true)
        console.log('[MiniPay] Auto-connected successfully:', address)
      }
    }
    
    // Small delay to ensure provider is fully injected
    const timer = setTimeout(autoConnect, 100)
    return () => clearTimeout(timer)
  }, [connectWallet])

  /**
   * Refresh balances for connected wallet
   */
  const refreshBalances = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      const [cusd, usdt] = await Promise.all([
        getMiniPayCUSDBalance(walletAddress).catch(() => '0'),
        getMiniPayUSDTBalance(walletAddress).catch(() => '0')
      ])
      
      setCusdBalance(parseFloat(cusd).toFixed(2))
      setUsdtBalance(parseFloat(usdt).toFixed(2))
    } catch (error) {
      console.error('[MiniPay] Balance refresh failed:', error)
    }
  }, [walletAddress])

  const contextValue: MiniPayContextType = {
    isMiniPay: initialDetection.isMiniPay,
    hasWalletProvider: initialDetection.hasProvider,
    walletAddress,
    cusdBalance,
    usdtBalance,
    isConnecting,
    isAutoConnected,
    connectWallet,
    refreshBalances
  }

  return (
    <MiniPayContext.Provider value={contextValue}>
      {children}
    </MiniPayContext.Provider>
  )
}

// Legacy export for compatibility
export const useMiniPayWallet = () => {
  const context = useContext(MiniPayContext)
  return {
    walletAddress: context.walletAddress,
    isMiniPay: context.isMiniPay,
    hasWalletProvider: context.hasWalletProvider,
    cusdBalance: context.cusdBalance,
    usdtBalance: context.usdtBalance,
    isConnected: !!context.walletAddress,
    isAutoConnected: context.isAutoConnected,
    connect: context.connectWallet
  }
}
