import { useState, useEffect, useCallback } from 'react';
import { 
  isMiniPayEnvironment, 
  getMiniPayProvider, 
  connectMiniPay, 
  getMiniPayAccount,
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
  const [masterWalletAddress, setMasterWalletAddress] = useState<string | null>(null);

  // Detect MiniPay environment
  useEffect(() => {
    const detected = isMiniPayEnvironment();
    setIsMiniPay(detected);
    
    if (detected) {
      // Check if already connected
      getMiniPayAccount().then(acc => {
        if (acc) {
          setAccount(acc);
          setIsConnected(true);
          getMiniPayCUSDBalance(acc).then(setCusdBalance);
        }
        setIsLoading(false);
      });
      
      // Listen for account changes
      const provider = getMiniPayProvider();
      if (provider) {
        const handleAccountsChanged = (accounts: unknown) => {
          const accs = accounts as string[];
          if (accs.length > 0) {
            setAccount(accs[0]);
            setIsConnected(true);
            getMiniPayCUSDBalance(accs[0]).then(setCusdBalance);
          } else {
            setAccount(null);
            setIsConnected(false);
            setCusdBalance('0');
          }
        };
        
        provider.on('accountsChanged', handleAccountsChanged);
        
        return () => {
          provider.removeListener('accountsChanged', handleAccountsChanged);
        };
      }
    } else {
      setIsLoading(false);
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
        console.error('Failed to fetch master wallet:', error);
      }
    };
    
    fetchMasterWallet();
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const acc = await connectMiniPay();
      if (acc) {
        setAccount(acc);
        setIsConnected(true);
        const balance = await getMiniPayCUSDBalance(acc);
        setCusdBalance(balance);
        toast.success('MiniPay connected!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('MiniPay connection failed:', error);
      toast.error('Failed to connect MiniPay');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (account) {
      const balance = await getMiniPayCUSDBalance(account);
      setCusdBalance(balance);
    }
  }, [account]);

  const deposit = useCallback(async (amountNGN: number): Promise<{ success: boolean; txHash?: string }> => {
    if (!masterWalletAddress) {
      toast.error('Master wallet not available');
      return { success: false };
    }

    if (!isConnected) {
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
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error('Deposit failed');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [masterWalletAddress, isConnected, connect, refreshBalance]);

  return {
    isMiniPay,
    isConnected,
    account,
    cusdBalance,
    isLoading,
    connect,
    deposit,
    refreshBalance
  };
};
