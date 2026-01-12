import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  isMiniPayEnvironment, 
  hasWalletProvider,
  getMiniPayAccount,
  connectMiniPay,
  getMiniPayCUSDBalance,
  depositViaMiniPay
} from '@/lib/minipay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseMiniPayReturn {
  isMiniPay: boolean;
  isConnected: boolean;
  account: string | null;
  cusdBalance: string;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<boolean>;
  deposit: (amountNGN: number) => Promise<{ success: boolean; txHash?: string }>;
  refreshBalance: () => Promise<void>;
}

export const useMiniPay = (): UseMiniPayReturn => {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [cusdBalance, setCusdBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masterWalletAddress, setMasterWalletAddress] = useState<string | null>(null);
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
          
          // Fetch balance
          const balance = await getMiniPayCUSDBalance(acc);
          setCusdBalance(parseFloat(balance).toFixed(2));
          console.log('[MiniPay] cUSD Balance:', balance);
        } else if (inMiniPay) {
          // In MiniPay but no account yet - try to request
          const connected = await connectMiniPay();
          if (connected) {
            setAccount(connected);
            setIsConnected(true);
            const balance = await getMiniPayCUSDBalance(connected);
            setCusdBalance(parseFloat(balance).toFixed(2));
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
          const balance = await getMiniPayCUSDBalance(accs[0]);
          setCusdBalance(parseFloat(balance).toFixed(2));
        } else {
          setAccount(null);
          setIsConnected(false);
          setCusdBalance('0');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Fetch master wallet address
  useEffect(() => {
    const fetchMasterWallet = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-master-wallet-address');
        if (data?.address) {
          setMasterWalletAddress(data.address);
        }
      } catch (error) {
        console.error('[MiniPay] Failed to fetch master wallet:', error);
      }
    };
    
    fetchMasterWallet();
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const acc = await connectMiniPay();
      if (acc) {
        setAccount(acc);
        setIsConnected(true);
        const balance = await getMiniPayCUSDBalance(acc);
        setCusdBalance(parseFloat(balance).toFixed(2));
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
        const balance = await getMiniPayCUSDBalance(account);
        setCusdBalance(parseFloat(balance).toFixed(2));
      } catch (err) {
        console.error('[MiniPay] Balance refresh failed:', err);
      }
    }
  }, [account]);

  const deposit = useCallback(async (amountNGN: number): Promise<{ success: boolean; txHash?: string }> => {
    if (!masterWalletAddress) {
      toast.error('Master wallet not available');
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
      
      const result = await depositViaMiniPay(masterWalletAddress, amountNGN, exchangeRate);
      
      if (result.success && result.txHash) {
        toast.success(`Deposit initiated! TX: ${result.txHash.slice(0, 10)}...`);
        
        // Notify backend about the deposit
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
  }, [masterWalletAddress, isConnected, account, connect, refreshBalance]);

  return {
    isMiniPay,
    isConnected,
    account,
    cusdBalance,
    isLoading,
    error,
    connect,
    deposit,
    refreshBalance
  };
};
