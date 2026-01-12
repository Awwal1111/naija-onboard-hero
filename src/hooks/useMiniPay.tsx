import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  isMiniPayEnvironment, 
  hasWalletProvider,
  getMiniPayAccount,
  connectMiniPay,
  getMiniPayCUSDBalance,
  getMiniPayUSDTBalance,
  sendCUSDViaMiniPay,
  sendUSDTViaMiniPay,
  CUSD_ADDRESS,
  USDT_ADDRESS
} from '@/lib/minipay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const useMiniPay = (): UseMiniPayReturn => {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [cusdBalance, setCusdBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const initRef = useRef(false);

  // Initialize MiniPay detection and auto-connect
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if we're in MiniPay environment
        const inMiniPay = isMiniPayEnvironment();
        setIsMiniPay(inMiniPay);
        console.log('[MiniPay] Environment detected:', inMiniPay);

        // Check if wallet provider exists
        if (!hasWalletProvider()) {
          console.log('[MiniPay] No wallet provider found');
          setIsLoading(false);
          return;
        }

        // In MiniPay, the wallet is auto-connected
        // Try to get the account directly
        const acc = await getMiniPayAccount();
        console.log('[MiniPay] Account:', acc);
        
        if (acc) {
          setAccount(acc);
          setIsConnected(true);
          
          // Fetch both balances in parallel
          const [cusdBal, usdtBal] = await Promise.all([
            getMiniPayCUSDBalance(acc),
            getMiniPayUSDTBalance(acc)
          ]);
          setCusdBalance(parseFloat(cusdBal).toFixed(2));
          setUsdtBalance(parseFloat(usdtBal).toFixed(2));
          console.log('[MiniPay] cUSD Balance:', cusdBal, 'USDT Balance:', usdtBal);
          
          // Fetch user's assigned wallet address from profile
          await fetchUserWalletAddress(acc);
        } else if (inMiniPay) {
          // In MiniPay but no account yet - try to request
          const connected = await connectMiniPay();
          if (connected) {
            setAccount(connected);
            setIsConnected(true);
            const [cusdBal, usdtBal] = await Promise.all([
              getMiniPayCUSDBalance(connected),
              getMiniPayUSDTBalance(connected)
            ]);
            setCusdBalance(parseFloat(cusdBal).toFixed(2));
            setUsdtBalance(parseFloat(usdtBal).toFixed(2));
            
            await fetchUserWalletAddress(connected);
          }
        }
      } catch (err) {
        console.error('[MiniPay] Init error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: unknown) => {
        const accs = accounts as string[];
        console.log('[MiniPay] Accounts changed:', accs);
        if (accs.length > 0) {
          setAccount(accs[0]);
          setIsConnected(true);
          const [cusdBal, usdtBal] = await Promise.all([
            getMiniPayCUSDBalance(accs[0]),
            getMiniPayUSDTBalance(accs[0])
          ]);
          setCusdBalance(parseFloat(cusdBal).toFixed(2));
          setUsdtBalance(parseFloat(usdtBal).toFixed(2));
          
          await fetchUserWalletAddress(accs[0]);
        } else {
          setAccount(null);
          setIsConnected(false);
          setCusdBalance('0');
          setUsdtBalance('0');
          setUserWalletAddress(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Fetch user's assigned Celo wallet address from their profile
  const fetchUserWalletAddress = async (miniPayAddress: string) => {
    try {
      // First check if user exists with this MiniPay wallet
      const { data: profile } = await supabase
        .from('profiles')
        .select('celo_wallet_address, user_id')
        .or(`celo_wallet_address.ilike.${miniPayAddress.toLowerCase()},minipay_address.ilike.${miniPayAddress.toLowerCase()}`)
        .maybeSingle();

      if (profile?.celo_wallet_address) {
        setUserWalletAddress(profile.celo_wallet_address);
        console.log('[MiniPay] User wallet address:', profile.celo_wallet_address);
      } else {
        // User doesn't have an assigned wallet yet - they need to sign up
        // For now, store their MiniPay address
        console.log('[MiniPay] No assigned wallet found for this user');
        setUserWalletAddress(null);
      }
    } catch (err) {
      console.error('[MiniPay] Failed to fetch user wallet:', err);
    }
  };

  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const acc = await connectMiniPay();
      if (acc) {
        setAccount(acc);
        setIsConnected(true);
        const [cusdBal, usdtBal] = await Promise.all([
          getMiniPayCUSDBalance(acc),
          getMiniPayUSDTBalance(acc)
        ]);
        setCusdBalance(parseFloat(cusdBal).toFixed(2));
        setUsdtBalance(parseFloat(usdtBal).toFixed(2));
        
        await fetchUserWalletAddress(acc);
        
        toast.success('Wallet connected!');
        return true;
      }
      setError('Failed to connect wallet');
      return false;
    } catch (err) {
      console.error('[MiniPay] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      toast.error('Failed to connect wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (account) {
      try {
        const [cusdBal, usdtBal] = await Promise.all([
          getMiniPayCUSDBalance(account),
          getMiniPayUSDTBalance(account)
        ]);
        setCusdBalance(parseFloat(cusdBal).toFixed(2));
        setUsdtBalance(parseFloat(usdtBal).toFixed(2));
      } catch (err) {
        console.error('[MiniPay] Balance refresh failed:', err);
      }
    }
  }, [account]);

  const deposit = useCallback(async (
    amountNGN: number, 
    token: 'cusd' | 'usdt' = 'cusd'
  ): Promise<{ success: boolean; txHash?: string }> => {
    // User must have an assigned wallet to deposit
    if (!userWalletAddress) {
      toast.error('Please complete registration to get a wallet address');
      return { success: false };
    }

    if (!isConnected || !account) {
      const connected = await connect();
      if (!connected) return { success: false };
    }

    setIsLoading(true);
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
        toWallet: userWalletAddress,
        exchangeRate
      });

      // Send to USER's assigned wallet, not master wallet
      let result;
      if (token === 'usdt') {
        result = await sendUSDTViaMiniPay(userWalletAddress, amountInStable);
      } else {
        result = await sendCUSDViaMiniPay(userWalletAddress, amountInStable);
      }
      
      if (result.success && result.txHash) {
        toast.success(`Deposit initiated! TX: ${result.txHash.slice(0, 10)}...`);
        
        // Notify backend about the deposit - it will sweep and credit
        await supabase.functions.invoke('check-celo-deposits');
        
        await refreshBalance();
      } else {
        toast.error(result.error || 'Deposit failed');
      }
      
      return result;
    } catch (err) {
      console.error('[MiniPay] Deposit failed:', err);
      toast.error('Deposit failed');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [userWalletAddress, isConnected, account, connect, refreshBalance]);

  return {
    isMiniPay,
    isConnected,
    account,
    cusdBalance,
    usdtBalance,
    isLoading,
    error,
    userWalletAddress,
    connect,
    deposit,
    refreshBalance
  };
};
