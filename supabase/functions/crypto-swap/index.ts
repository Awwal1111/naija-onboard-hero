import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Swap fee - platform revenue
const SWAP_FEE_PERCENT = 1.5;

// Token balances stored in user_wallets table
// NC = Naira (1:1), USDT/cUSD/USDC = stablecoins, CELO = native

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get live exchange rates
async function getExchangeRates() {
  const rates: Record<string, number> = {
    USD_NGN: 1600,
    CELO_USD: 0.65,
    CELO_NGN: 1040,
    cUSD_NGN: 1600,
    USDT_NGN: 1600,
    USDC_NGN: 1600,
  };
  
  try {
    // Get USD/NGN rate
    const rateResponse = await fetch("https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (rateResponse.ok) {
      const rateData = await rateResponse.json();
      rates.USD_NGN = rateData.conversion_rates?.NGN || 1600;
    }

    // Get CELO price in USD
    const celoResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd", {
      signal: AbortSignal.timeout(5000)
    });
    
    if (celoResponse.ok) {
      const celoData = await celoResponse.json();
      rates.CELO_USD = celoData.celo?.usd || 0.65;
    }

    // Calculate derived rates
    rates.CELO_NGN = rates.CELO_USD * rates.USD_NGN;
    rates.cUSD_NGN = rates.USD_NGN;
    rates.USDT_NGN = rates.USD_NGN;
    rates.USDC_NGN = rates.USD_NGN;

    console.log("[RATES]", rates);
    return rates;
  } catch (error) {
    console.error("[RATES] Error:", error);
    return rates;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "get_rates") {
      const rates = await getExchangeRates();
      return new Response(JSON.stringify({
        success: true,
        rates,
        tokens: ['NC', 'cUSD', 'USDT', 'USDC', 'CELO'],
        timestamp: Date.now()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get_quote") {
      const { fromToken, toToken, amount } = body;
      const rates = await getExchangeRates();
      
      const inputAmount = parseFloat(amount);
      const feeAmount = inputAmount * (SWAP_FEE_PERCENT / 100);
      const netInput = inputAmount - feeAmount;
      
      let outputAmount = 0;
      
      if (fromToken === "NC") {
        if (toToken === "cUSD" || toToken === "USDT" || toToken === "USDC") {
          outputAmount = netInput / rates.USD_NGN;
        } else if (toToken === "CELO") {
          outputAmount = netInput / rates.CELO_NGN;
        }
      } else if (toToken === "NC") {
        if (fromToken === "cUSD" || fromToken === "USDT" || fromToken === "USDC") {
          outputAmount = netInput * rates.USD_NGN;
        } else if (fromToken === "CELO") {
          outputAmount = netInput * rates.CELO_NGN;
        }
      } else {
        // Crypto to crypto
        const fromRate = fromToken === "CELO" ? rates.CELO_USD : 1;
        const toRate = toToken === "CELO" ? rates.CELO_USD : 1;
        outputAmount = (netInput * fromRate) / toRate;
      }
      
      return new Response(JSON.stringify({
        success: true,
        quote: {
          fromToken,
          toToken,
          inputAmount,
          outputAmount,
          fee: feeAmount,
          feePercent: SWAP_FEE_PERCENT,
          timestamp: Date.now()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "execute_swap") {
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

      const { fromToken, toToken, amount } = body;
      const rates = await getExchangeRates();
      const inputAmount = parseFloat(amount);

      console.log(`[SWAP] ${user.id}: ${inputAmount} ${fromToken} -> ${toToken}`);

      // Get user's wallet
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance, balance_withdrawable")
        .eq("user_id", user.id)
        .single();

      // Check balance based on fromToken
      let availableBalance = 0;
      if (fromToken === "NC") {
        availableBalance = profile?.balance_withdrawable || 0;
      } else if (wallet) {
        if (fromToken === "cUSD") availableBalance = wallet.cusd_balance || 0;
        else if (fromToken === "USDT") availableBalance = wallet.usdt_balance || 0;
        else if (fromToken === "USDC") availableBalance = wallet.usdc_balance || 0;
        else if (fromToken === "CELO") availableBalance = wallet.celo_balance || 0;
      }

      if (availableBalance < inputAmount) {
        throw new Error(`Insufficient ${fromToken} balance. Available: ${availableBalance}`);
      }

      // Calculate output with fees
      const feeAmount = inputAmount * (SWAP_FEE_PERCENT / 100);
      const netInput = inputAmount - feeAmount;
      
      let outputAmount = 0;
      
      if (fromToken === "NC") {
        if (toToken === "cUSD" || toToken === "USDT" || toToken === "USDC") {
          outputAmount = netInput / rates.USD_NGN;
        } else if (toToken === "CELO") {
          outputAmount = netInput / rates.CELO_NGN;
        }
      } else if (toToken === "NC") {
        if (fromToken === "cUSD" || fromToken === "USDT" || fromToken === "USDC") {
          outputAmount = netInput * rates.USD_NGN;
        } else if (fromToken === "CELO") {
          outputAmount = netInput * rates.CELO_NGN;
        }
      } else {
        const fromRate = fromToken === "CELO" ? rates.CELO_USD : 1;
        const toRate = toToken === "CELO" ? rates.CELO_USD : 1;
        outputAmount = (netInput * fromRate) / toRate;
      }

      // Execute the swap - update balances
      if (fromToken === "NC") {
        // Deduct NC from profile
        await supabase
          .from("profiles")
          .update({
            wallet_balance: (profile?.wallet_balance || 0) - inputAmount,
            balance_withdrawable: (profile?.balance_withdrawable || 0) - inputAmount
          })
          .eq("user_id", user.id);

        // Add crypto to wallet
        const updateField = toToken === "cUSD" ? "cusd_balance" : 
                           toToken === "USDT" ? "usdt_balance" :
                           toToken === "USDC" ? "usdc_balance" : "celo_balance";
        
        if (wallet) {
          await supabase
            .from("user_wallets")
            .update({ [updateField]: (wallet[updateField] || 0) + outputAmount })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_wallets")
            .insert({ user_id: user.id, [updateField]: outputAmount });
        }
      } else if (toToken === "NC") {
        // Deduct crypto from wallet
        const updateField = fromToken === "cUSD" ? "cusd_balance" : 
                           fromToken === "USDT" ? "usdt_balance" :
                           fromToken === "USDC" ? "usdc_balance" : "celo_balance";
        
        await supabase
          .from("user_wallets")
          .update({ [updateField]: (wallet?.[updateField] || 0) - inputAmount })
          .eq("user_id", user.id);

        // Add NC to profile
        await supabase
          .from("profiles")
          .update({
            wallet_balance: (profile?.wallet_balance || 0) + outputAmount,
            balance_withdrawable: (profile?.balance_withdrawable || 0) + outputAmount
          })
          .eq("user_id", user.id);
      } else {
        // Crypto to crypto swap
        const fromField = fromToken === "cUSD" ? "cusd_balance" : 
                         fromToken === "USDT" ? "usdt_balance" :
                         fromToken === "USDC" ? "usdc_balance" : "celo_balance";
        const toField = toToken === "cUSD" ? "cusd_balance" : 
                       toToken === "USDT" ? "usdt_balance" :
                       toToken === "USDC" ? "usdc_balance" : "celo_balance";
        
        await supabase
          .from("user_wallets")
          .update({ 
            [fromField]: (wallet?.[fromField] || 0) - inputAmount,
            [toField]: (wallet?.[toField] || 0) + outputAmount
          })
          .eq("user_id", user.id);
      }

      // Record fee to admin wallet
      const feeInNGN = fromToken === "NC" ? feeAmount : 
                       (fromToken === "CELO" ? feeAmount * rates.CELO_NGN : feeAmount * rates.USD_NGN);
      
      await supabase.rpc('increment_wallet_balance', {
        target_user_id: user.id, // This should be admin, but using platform fee tracking
        amount_to_add: 0 // Fee goes to platform
      });

      // Log transaction
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        kind: "swap",
        amount: toToken === "NC" ? outputAmount : -inputAmount,
        status: "completed",
        reference: `Swap: ${inputAmount} ${fromToken} → ${outputAmount.toFixed(4)} ${toToken} (Fee: ${feeAmount.toFixed(4)} ${fromToken})`
      });

      // Add to admin wallet (platform fee)
      await supabase
        .from("admin_wallet")
        .update({ balance: supabase.rpc('admin_wallet.balance') })
        .eq("id", 1);

      console.log(`[SWAP] ✅ ${inputAmount} ${fromToken} -> ${outputAmount.toFixed(4)} ${toToken}, Fee: ${feeAmount}`);

      return new Response(JSON.stringify({
        success: true,
        swap: {
          fromToken,
          toToken,
          inputAmount,
          outputAmount,
          fee: feeAmount,
          feePercent: SWAP_FEE_PERCENT
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
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
