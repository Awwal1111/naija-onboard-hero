import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  detectMiniPaySync,
  getMiniPayAccount,
  connectMiniPay,
  getMiniPayCUSDBalance,
  getMiniPayUSDTBalance,
  sendCUSDViaMiniPay,
  sendUSDTViaMiniPay
} from '@/lib/minipay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UseMiniPayReturn {
  isMiniPay: boolean;
  isConnected: boolean;
  account: string | null;
  cusdBalance: string;
  usdtBalance: string;
  isLoading: boolean;
  error: string | null;
  userWalletAddress: string | null;
  connect: () => Promise<boolean>;
  deposit: (amountNGN: number, token?: 'cusd' | 'usdt') => Promise<{ success: boolean; txHash?: string }>;
  refreshBalance: () => Promise<void>;
}

// Sync detection at module load - NO async calls
const initialDetection = detectMiniPaySync();

/**
 * useMiniPay - LAZY INITIALIZATION PATTERN
 * 
 * On load: ONLY sync environment detection
 * - NO wallet calls (getMiniPayAccount)
 * - NO Supabase queries
 * - NO auto-connect
 * 
 * All wallet/balance logic is DEFERRED to explicit user actions
 * (connect() or deposit() calls)
 * 
 * This prevents MiniPay WebView flickering caused by async operations during startup.
 */
export const useMiniPay = (): UseMiniPayReturn => {
  const { user } = useAuth();
  
  // Use sync detection - NO async useEffect on mount
  const [state, setState] = useState({
    isMiniPay: initialDetection.isMiniPay,
    hasProvider: initialDetection.hasProvider,
    isConnected: false,
    account: null as string | null,
    cusdBalance: '0',
    usdtBalance: '0',
    isLoading: false, // NOT true on mount - critical
    error: null as string | null,
    userWalletAddress: null as string | null
  });

  // Track initialization to prevent double-init
  const initRef = useRef(false);

  /**
   * Fetch the LOGGED-IN user's wallet address from their profile
   * This is where deposits will be sent - NOT matching by MiniPay address
   */
  const fetchLoggedInUserWallet = useCallback(async (): Promise<string | null> => {
    if (!user?.id) {
      console.log('[MiniPay] No logged-in user, cannot fetch wallet');
      return null;
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[MiniPay] Error fetching profile:', error);
        return null;
      }

      if (profile?.celo_wallet_address) {
        console.log('[MiniPay] User wallet address:', profile.celo_wallet_address);
        return profile.celo_wallet_address;
      }
      
      // User doesn't have a wallet yet - try to create one
      console.log('[MiniPay] No wallet found, attempting to create one...');
      const { data: walletData, error: walletError } = await supabase.functions.invoke('create-user-wallet');
      
      if (walletError) {
        console.error('[MiniPay] Failed to create wallet:', walletError);
        return null;
      }
      
      if (walletData?.address) {
        console.log('[MiniPay] Created new wallet:', walletData.address);
        return walletData.address;
      }
      
      return null;
    } catch (err) {
      console.error('[MiniPay] Failed to fetch user wallet:', err);
      return null;
    }
  }, [user?.id]);

  /**
   * LAZY CONNECT - Only called when user explicitly triggers connection
   * Uses single setState pattern to prevent flickering
   */
  const connect = useCallback(async (): Promise<boolean> => {
    // Already connected
    if (state.isConnected && state.account) {
      return true;
    }

    // Already initializing
    if (initRef.current) {
      return false;
    }

    // No provider available
    if (!state.hasProvider) {
      return false;
    }

    initRef.current = true;

    // Build complete next state
    let nextState = {
      isLoading: false,
      error: null as string | null,
      isConnected: false,
      account: null as string | null,
      cusdBalance: '0',
      usdtBalance: '0',
      userWalletAddress: null as string | null
    };

    // Show loading state - single update
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try to get account (in MiniPay it might already be available)
      let acc = await getMiniPayAccount();
      
      if (!acc && state.isMiniPay) {
        // Try explicit connect
        acc = await connectMiniPay();
      }

      if (acc) {
        console.log('[MiniPay] Connected:', acc);
        
        // Fetch balances and logged-in user's wallet address in parallel
        const [cusdBal, usdtBal, walletAddr] = await Promise.all([
          getMiniPayCUSDBalance(acc).catch(() => '0'),
          getMiniPayUSDTBalance(acc).catch(() => '0'),
          fetchLoggedInUserWallet()
        ]);

        nextState = {
          isLoading: false,
          error: null,
          isConnected: true,
          account: acc,
          cusdBalance: parseFloat(cusdBal).toFixed(2),
          usdtBalance: parseFloat(usdtBal).toFixed(2),
          userWalletAddress: walletAddr
        };

        // ✅ SINGLE setState call
        setState(prev => ({ ...prev, ...nextState }));
        initRef.current = false;
        return true;
      } else {
        nextState.error = 'Failed to connect wallet';
        setState(prev => ({ ...prev, ...nextState }));
        initRef.current = false;
        return false;
      }
    } catch (err) {
      console.error('[MiniPay] Connection failed:', err);
      nextState.error = err instanceof Error ? err.message : 'Connection failed';
      setState(prev => ({ ...prev, ...nextState }));
      initRef.current = false;
      return false;
    }
  }, [state.isConnected, state.account, state.hasProvider, state.isMiniPay, fetchLoggedInUserWallet]);

  const refreshBalance = useCallback(async () => {
    if (!state.account) return;

    try {
      const [cusdBal, usdtBal] = await Promise.all([
        getMiniPayCUSDBalance(state.account).catch(() => '0'),
        getMiniPayUSDTBalance(state.account).catch(() => '0')
      ]);

      // ✅ SINGLE setState call
      setState(prev => ({
        ...prev,
        cusdBalance: parseFloat(cusdBal).toFixed(2),
        usdtBalance: parseFloat(usdtBal).toFixed(2)
      }));
    } catch (err) {
      console.error('[MiniPay] Balance refresh failed:', err);
    }
  }, [state.account]);

  const deposit = useCallback(async (
    amountNGN: number, 
    token: 'cusd' | 'usdt' = 'cusd'
  ): Promise<{ success: boolean; txHash?: string }> => {
    // Ensure connected first
    if (!state.isConnected || !state.account) {
      const connected = await connect();
      if (!connected) {
        toast.error('Please connect your wallet first');
        return { success: false };
      }
    }

    // User must have an assigned wallet to deposit
    if (!state.userWalletAddress) {
      toast.error('Please complete registration to get a wallet address');
      return { success: false };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get live exchange rate
      const { data: rateData } = await supabase.functions.invoke('quidax-on-ramp', {
        body: { action: 'get_rate' }
      });
      
      const exchangeRate = rateData?.rate || 1600;
      const amountInStable = amountNGN / exchangeRate;
      
      console.log('[MiniPay] Depositing:', {
        amountNGN,
        amountInStable,
        token,
        toWallet: state.userWalletAddress,
        exchangeRate
      });

      // Send to USER's assigned wallet
      let result;
      if (token === 'usdt') {
        result = await sendUSDTViaMiniPay(state.userWalletAddress, amountInStable);
      } else {
        result = await sendCUSDViaMiniPay(state.userWalletAddress, amountInStable);
      }
      
      if (result.success && result.txHash) {
        toast.success(`Deposit initiated! TX: ${result.txHash.slice(0, 10)}...`);
        
        // Notify backend about the deposit
        await supabase.functions.invoke('check-celo-deposits');
        
        await refreshBalance();
      } else {
        toast.error(result.error || 'Deposit failed');
      }
      
      // ✅ SINGLE setState call
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (err) {
      console.error('[MiniPay] Deposit failed:', err);
      toast.error('Deposit failed');
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false };
    }
  }, [state.isConnected, state.account, state.userWalletAddress, connect, refreshBalance]);

  return {
    isMiniPay: state.isMiniPay,
    isConnected: state.isConnected,
    account: state.account,
    cusdBalance: state.cusdBalance,
    usdtBalance: state.usdtBalance,
    isLoading: state.isLoading,
    error: state.error,
    userWalletAddress: state.userWalletAddress,
    connect,
    deposit,
    refreshBalance
  };
};
