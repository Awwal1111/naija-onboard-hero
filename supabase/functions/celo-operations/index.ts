import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CELO_RPC = "https://forno.celo.org";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";
const MIN_WITHDRAWAL_NC = 100;

// Token addresses on Celo mainnet
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CeloRequest {
  operation: 'withdrawal' | 'deposit-webhook' | 'check-deposits' | 'get-balance';
  walletAddress?: string;
  ncAmount?: number;
  currency?: string;
  signature?: string;
  rawBody?: string;
}

// Shared utility to get exchange rate
async function getExchangeRate(): Promise<number> {
  let usdToNgn = 1600; // Default fallback
  try {
    const rateResponse = await fetch(EXCHANGE_RATE_API, {
      signal: AbortSignal.timeout(5000)
    });
    if (rateResponse.ok) {
      const rateData = await rateResponse.json();
      usdToNgn = rateData.conversion_rates?.NGN || 1600;
    }
  } catch (error) {
    console.error('[CELO] Exchange rate fetch error:', error);
  }
  return usdToNgn;
}

// Handle Celo withdrawal
async function handleWithdrawal(
  userId: string,
  walletAddress: string,
  ncAmount: number,
  currency: string
) {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  if (ncAmount < MIN_WITHDRAWAL_NC) {
    throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL_NC} NC`);
  }

  if (!["cUSD", "CELO", "USDT"].includes(currency)) {
    throw new Error("Currency must be cUSD, USDT, or CELO");
  }

  // Get user profile and check balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance, balance_withdrawable, full_name, celo_wallet_address")
    .eq("user_id", userId)
    .single();

  if (!profile || profile.balance_withdrawable < ncAmount) {
    throw new Error("Insufficient withdrawable balance");
  }

  // Get exchange rate
  const usdToNgn = await getExchangeRate();
  const cryptoAmount = ncAmount / usdToNgn; // Simple conversion (1 NC ≈ 1 NGN)

  // Create withdrawal transaction record
  const { data: transaction, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      kind: "withdrawal",
      amount: -ncAmount,
      currency: currency,
      status: "pending",
      metadata: {
        walletAddress,
        cryptoAmount,
        provider: "celo"
      }
    })
    .select()
    .single();

  if (txError) throw txError;

  // Update user balance
  await supabase
    .from("profiles")
    .update({
      balance_withdrawable: profile.balance_withdrawable - ncAmount,
      wallet_balance: profile.wallet_balance - ncAmount
    })
    .eq("user_id", userId);

  console.log('[CELO] Withdrawal initiated:', {
    transactionId: transaction.id,
    userId,
    amount: ncAmount,
    currency
  });

  return {
    success: true,
    transactionId: transaction.id,
    status: "pending",
    estimatedAmount: cryptoAmount,
    currency
  };
}

// Handle Celo deposit webhook
async function handleDepositWebhook(rawBody: string, signature: string) {
  const CELO_WEBHOOK_SECRET = Deno.env.get("CELO_WEBHOOK_SECRET");

  if (!CELO_WEBHOOK_SECRET) {
    throw new Error("CELO_WEBHOOK_SECRET not configured");
  }

  // Verify signature
  const expectedSignature = CryptoJS.enc.Hex.stringify(
    CryptoJS.HmacSHA256(rawBody, CELO_WEBHOOK_SECRET)
  );

  if (expectedSignature !== signature) {
    throw new Error("Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody);
  const { transactionHash, fromAddress, toAddress, amount, tokenSymbol, status } = payload;

  console.log('[CELO] Deposit webhook:', { transactionHash, status });

  // Find matching transaction record
  const { data: transaction } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("metadata->toAddress", toAddress)
    .single()
    .catch(() => ({ data: null }));

  if (!transaction) {
    console.warn('[CELO] No matching transaction found for webhook');
    return { processed: false };
  }

  // Update transaction status
  const { data: updatedTx } = await supabase
    .from("wallet_transactions")
    .update({
      status: status === "confirmed" ? "completed" : status,
      metadata: {
        ...transaction.metadata,
        transactionHash,
        fromAddress,
        confirmedAt: new Date().toISOString()
      }
    })
    .eq("id", transaction.id)
    .select()
    .single();

  // If confirmed, update user balance
  if (status === "confirmed" && updatedTx) {
    const ncAmount = transaction.amount; // Already in NC
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance, balance_non_withdrawable")
      .eq("user_id", transaction.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          wallet_balance: profile.wallet_balance + ncAmount,
          balance_non_withdrawable: profile.balance_non_withdrawable + (ncAmount * 0.3) // 30% locked
        })
        .eq("user_id", transaction.user_id);
    }
  }

  return { processed: true, transactionId: transaction.id };
}

// Check for incoming Celo deposits
async function checkDeposits(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("celo_wallet_address")
    .eq("user_id", userId)
    .single();

  if (!profile?.celo_wallet_address) {
    throw new Error("User doesn't have a Celo wallet configured");
  }

  // Query Celo RPC for recent transactions to this address
  const provider = new ethers.JsonRpcProvider(CELO_RPC);

  try {
    const balance = await provider.getBalance(profile.celo_wallet_address);
    const cUsdBalance = await provider.getCode(CUSD_ADDRESS).then(() => "0");

    console.log('[CELO] Balance check:', {
      address: profile.celo_wallet_address,
      celoBalance: ethers.formatEther(balance),
      cusdBalance: cUsdBalance
    });

    return {
      success: true,
      address: profile.celo_wallet_address,
      celoBalance: ethers.formatEther(balance),
      cusdBalance: cUsdBalance
    };
  } catch (error) {
    console.error('[CELO] Error checking deposits:', error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const celoSignature = req.headers.get("x-celo-signature");
    const rawBody = await req.text();
    const { operation, walletAddress, ncAmount, currency } = JSON.parse(rawBody || '{}');

    let userId: string | null = null;

    // For non-webhook operations, require auth
    if (operation !== 'deposit-webhook') {
      if (!authHeader) {
        throw new Error("No authorization header");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Unauthorized");
      }

      userId = user.id;
    }

    let response: any;

    switch (operation) {
      case 'withdrawal':
        response = await handleWithdrawal(userId!, walletAddress, ncAmount, currency);
        break;

      case 'deposit-webhook':
        response = await handleDepositWebhook(rawBody, celoSignature!);
        break;

      case 'check-deposits':
        response = await checkDeposits(userId!);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, data: response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[CELO] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
