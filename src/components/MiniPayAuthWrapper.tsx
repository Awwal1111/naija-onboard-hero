import { ReactNode, createContext, useContext, useCallback, useState } from 'react'
import { detectMiniPaySync, getMiniPayAccount, getMiniPayCUSDBalance, getMiniPayUSDTBalance } from '@/lib/minipay'

interface MiniPayContextType {
  isMiniPay: boolean
  hasWalletProvider: boolean
  walletAddress: string | null
  cusdBalance: string
  usdtBalance: string
  isConnecting: boolean
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
  connectWallet: async () => null,
  refreshBalances: async () => {}
})

export const useMiniPayContext = () => useContext(MiniPayContext)

interface MiniPayAuthWrapperProps {
  children: ReactNode
}

/**
 * MiniPayAuthWrapper - SIMPLIFIED VERSION
 * 
 * Purpose: Provide MiniPay wallet connection for DEPOSITS ONLY
 * 
 * Key changes:
 * - NO custom authentication (uses normal Supabase Auth)
 * - NO user profile management  
 * - ONLY handles wallet connection for deposits
 * - Users log in normally, then can deposit via MiniPay
 */
export const MiniPayAuthWrapper = ({ children }: MiniPayAuthWrapperProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [cusdBalance, setCusdBalance] = useState('0')
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [isConnecting, setIsConnecting] = useState(false)

  /**
   * Connect wallet - only called when user wants to deposit
   */
  const connectWallet = useCallback(async (): Promise<string | null> => {
    if (walletAddress) return walletAddress
    if (!initialDetection.hasProvider) return null

    setIsConnecting(true)
    
    try {
      const address = await getMiniPayAccount()
      
      if (address) {
        // Fetch balances
        const [cusd, usdt] = await Promise.all([
          getMiniPayCUSDBalance(address).catch(() => '0'),
          getMiniPayUSDTBalance(address).catch(() => '0')
        ])
        
        setWalletAddress(address)
        setCusdBalance(parseFloat(cusd).toFixed(2))
        setUsdtBalance(parseFloat(usdt).toFixed(2))
        
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
    connect: context.connectWallet
  }
}
