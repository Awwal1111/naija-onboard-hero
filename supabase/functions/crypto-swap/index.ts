import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CELO_RPC = "https://forno.celo.org";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Celo Mainnet Token Addresses
const TOKENS = {
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438", // Native CELO wrapped
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
};

// Mento Broker Contract (for swaps)
const MENTO_BROKER = "0x777A8255cA72412f0815fA7bdb68104962d6930A";

// Simple Mento Broker ABI for getting quotes
const MENTO_BROKER_ABI = [
  "function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut)",
  "function getAmountIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountOut) external view returns (uint256 amountIn)",
  "function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut)",
];

// Mento BiPoolManager (Exchange Provider)
const MENTO_EXCHANGE_PROVIDER = "0xAC11Aa0A1e9aD50fF90Ee5e6a46c8b1D29f6e21c";

// Exchange IDs for different pairs
const EXCHANGE_IDS = {
  "CELO/cUSD": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "CELO/cEUR": "0x0000000000000000000000000000000000000000000000000000000000000001",
  "CELO/cREAL": "0x0000000000000000000000000000000000000000000000000000000000000002",
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get live exchange rates
async function getExchangeRates(provider: ethers.JsonRpcProvider) {
  const rates: Record<string, number> = {};
  
  try {
    // Get USD/NGN rate
    const rateResponse = await fetch("https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (rateResponse.ok) {
      const rateData = await rateResponse.json();
      rates.USD_NGN = rateData.conversion_rates?.NGN || 1600;
    } else {
      rates.USD_NGN = 1600;
    }

    // Get CELO price in USD
    const celoResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (celoResponse.ok) {
      const celoData = await celoResponse.json();
      rates.CELO_USD = celoData.celo?.usd || 0.65;
    } else {
      rates.CELO_USD = 0.65;
    }

    // Calculate derived rates
    rates.CELO_NGN = rates.CELO_USD * rates.USD_NGN;
    rates.cUSD_NGN = rates.USD_NGN; // 1:1 with USD
    rates.USDT_NGN = rates.USD_NGN; // 1:1 with USD
    rates.USDC_NGN = rates.USD_NGN; // 1:1 with USD

    console.log("[RATES]", rates);
    return rates;
  } catch (error) {
    console.error("[RATES] Error fetching rates:", error);
    return {
      USD_NGN: 1600,
      CELO_USD: 0.65,
      CELO_NGN: 1040,
      cUSD_NGN: 1600,
      USDT_NGN: 1600,
      USDC_NGN: 1600,
    };
  }
}

// Get quote from Mento for CELO/cUSD swap
async function getMentoQuote(
  provider: ethers.JsonRpcProvider,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<bigint> {
  try {
    const broker = new ethers.Contract(MENTO_BROKER, MENTO_BROKER_ABI, provider);
    const exchangeId = EXCHANGE_IDS["CELO/cUSD"]; // Default exchange
    
    const amountOut = await broker.getAmountOut(
      MENTO_EXCHANGE_PROVIDER,
      exchangeId,
      tokenIn,
      tokenOut,
      amountIn
    );
    
    return amountOut;
  } catch (error) {
    console.error("[MENTO] Quote error:", error);
    throw new Error("Failed to get swap quote from Mento");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const provider = new ethers.JsonRpcProvider(CELO_RPC);

    if (action === "get_rates") {
      // Return current exchange rates
      const rates = await getExchangeRates(provider);
      
      return new Response(JSON.stringify({
        success: true,
        rates,
        tokens: Object.keys(TOKENS),
        timestamp: Date.now()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get_quote") {
      const { fromToken, toToken, amount } = await req.json();
      const rates = await getExchangeRates(provider);
      
      // Calculate quote based on rates
      let outputAmount = 0;
      let rate = 0;
      
      if (fromToken === "NC") {
        // NC to crypto (withdrawal)
        const ncAmount = parseFloat(amount);
        if (toToken === "cUSD" || toToken === "USDT" || toToken === "USDC") {
          outputAmount = ncAmount / rates.USD_NGN;
          rate = 1 / rates.USD_NGN;
        } else if (toToken === "CELO") {
          outputAmount = ncAmount / rates.CELO_NGN;
          rate = 1 / rates.CELO_NGN;
        }
      } else if (toToken === "NC") {
        // Crypto to NC (deposit)
        const cryptoAmount = parseFloat(amount);
        if (fromToken === "cUSD" || fromToken === "USDT" || fromToken === "USDC") {
          outputAmount = cryptoAmount * rates.USD_NGN;
          rate = rates.USD_NGN;
        } else if (fromToken === "CELO") {
          outputAmount = cryptoAmount * rates.CELO_NGN;
          rate = rates.CELO_NGN;
        }
      } else {
        // Crypto to crypto swap
        // First convert to USD, then to target
        const fromRate = fromToken === "CELO" ? rates.CELO_USD : 1; // CELO in USD, stables = 1
        const toRate = toToken === "CELO" ? rates.CELO_USD : 1;
        
        const cryptoAmount = parseFloat(amount);
        const usdValue = cryptoAmount * fromRate;
        outputAmount = usdValue / toRate;
        rate = fromRate / toRate;
      }
      
      return new Response(JSON.stringify({
        success: true,
        quote: {
          fromToken,
          toToken,
          inputAmount: parseFloat(amount),
          outputAmount,
          rate,
          fees: 0, // Could add fees later
          timestamp: Date.now()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "swap") {
      // Authenticated swap
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        throw new Error("Authorization required");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      const { fromToken, toToken, amount, destinationAddress } = await req.json();
      const rates = await getExchangeRates(provider);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance, balance_withdrawable, celo_wallet_address, encrypted_wallet")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Handle different swap scenarios
      if (fromToken === "NC") {
        // NC to Crypto (this is essentially a withdrawal)
        const ncAmount = parseFloat(amount);
        
        if (profile.balance_withdrawable < ncAmount) {
          throw new Error("Insufficient withdrawable balance");
        }

        // Calculate output
        let cryptoAmount = 0;
        let currency = toToken;
        
        if (toToken === "cUSD" || toToken === "USDT" || toToken === "USDC") {
          cryptoAmount = ncAmount / rates.USD_NGN;
        } else if (toToken === "CELO") {
          cryptoAmount = ncAmount / rates.CELO_NGN;
        }

        // Use celo-withdrawal edge function logic here or call it
        // For now, return the calculated amount and let frontend handle
        return new Response(JSON.stringify({
          success: true,
          swap: {
            fromToken: "NC",
            toToken,
            inputAmount: ncAmount,
            outputAmount: cryptoAmount,
            destination: destinationAddress,
            action: "use_withdrawal_function"
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // For crypto-to-crypto swaps (future enhancement with Mento)
      return new Response(JSON.stringify({
        success: false,
        error: "Crypto-to-crypto swaps coming soon. Use NC as intermediary."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Invalid action"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });

  } catch (error) {
    console.error("[CRYPTO-SWAP] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
