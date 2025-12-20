import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExchangeRates {
  USD_NGN: number;
  CELO_USD: number;
  CELO_NGN: number;
  cUSD_NGN: number;
  USDT_NGN: number;
  USDC_NGN: number;
}

interface SwapQuote {
  fromToken: string;
  toToken: string;
  inputAmount: number;
  outputAmount: number;
  rate: number;
  fees: number;
  timestamp: number;
}

const SUPPORTED_TOKENS = ['NC', 'cUSD', 'USDT', 'CELO', 'USDC'];

export const useCryptoSwap = () => {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Fetch exchange rates
  const fetchRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const { data, error } = await supabase.functions.invoke('crypto-swap', {
        body: { action: 'get_rates' }
      });

      if (error) throw error;

      if (data?.success && data?.rates) {
        setRates(data.rates);
        console.log('[SWAP] Rates updated:', data.rates);
      }
    } catch (error: any) {
      console.error('[SWAP] Error fetching rates:', error);
      // Use fallback rates
      setRates({
        USD_NGN: 1600,
        CELO_USD: 0.65,
        CELO_NGN: 1040,
        cUSD_NGN: 1600,
        USDT_NGN: 1600,
        USDC_NGN: 1600,
      });
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // Get swap quote
  const getQuote = useCallback(async (fromToken: string, toToken: string, amount: number) => {
    if (!amount || amount <= 0) {
      setQuote(null);
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('crypto-swap', {
        body: { 
          action: 'get_quote',
          fromToken,
          toToken,
          amount: amount.toString()
        }
      });

      if (error) throw error;

      if (data?.success && data?.quote) {
        setQuote(data.quote);
        return data.quote;
      }
      return null;
    } catch (error: any) {
      console.error('[SWAP] Error getting quote:', error);
      return null;
    }
  }, []);

  // Calculate output amount locally (for quick preview)
  const calculateOutput = useCallback((fromToken: string, toToken: string, amount: number): number => {
    if (!rates || !amount || amount <= 0) return 0;

    if (fromToken === 'NC') {
      if (toToken === 'cUSD' || toToken === 'USDT' || toToken === 'USDC') {
        return amount / rates.USD_NGN;
      } else if (toToken === 'CELO') {
        return amount / rates.CELO_NGN;
      }
    } else if (toToken === 'NC') {
      if (fromToken === 'cUSD' || fromToken === 'USDT' || fromToken === 'USDC') {
        return amount * rates.USD_NGN;
      } else if (fromToken === 'CELO') {
        return amount * rates.CELO_NGN;
      }
    } else {
      // Crypto to crypto
      const fromRate = fromToken === 'CELO' ? rates.CELO_USD : 1;
      const toRate = toToken === 'CELO' ? rates.CELO_USD : 1;
      return (amount * fromRate) / toRate;
    }
    return 0;
  }, [rates]);

  // Get rate for display
  const getDisplayRate = useCallback((fromToken: string, toToken: string): string => {
    if (!rates) return '-';

    if (fromToken === 'NC') {
      if (toToken === 'cUSD' || toToken === 'USDT' || toToken === 'USDC') {
        return `₦${rates.USD_NGN.toLocaleString()} = 1 ${toToken}`;
      } else if (toToken === 'CELO') {
        return `₦${rates.CELO_NGN.toFixed(2)} = 1 CELO`;
      }
    } else if (toToken === 'NC') {
      if (fromToken === 'cUSD' || fromToken === 'USDT' || fromToken === 'USDC') {
        return `1 ${fromToken} = ₦${rates.USD_NGN.toLocaleString()}`;
      } else if (fromToken === 'CELO') {
        return `1 CELO = ₦${rates.CELO_NGN.toFixed(2)}`;
      }
    } else {
      // Crypto to crypto
      const fromRate = fromToken === 'CELO' ? rates.CELO_USD : 1;
      const toRate = toToken === 'CELO' ? rates.CELO_USD : 1;
      const rate = fromRate / toRate;
      return `1 ${fromToken} = ${rate.toFixed(4)} ${toToken}`;
    }
    return '-';
  }, [rates]);

  useEffect(() => {
    fetchRates();
    // Refresh rates every 60 seconds
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  return {
    rates,
    quote,
    loading,
    ratesLoading,
    supportedTokens: SUPPORTED_TOKENS,
    fetchRates,
    getQuote,
    calculateOutput,
    getDisplayRate,
  };
};
