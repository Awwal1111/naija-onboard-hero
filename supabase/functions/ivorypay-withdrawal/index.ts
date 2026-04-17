import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Per IvoryPay docs: base URL is https://api.ivorypay.io/api, paths start with /v1/...
const IVORYPAY_BASE_URL = "https://api.ivorypay.io/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IVORYPAY_SECRET_KEY = Deno.env.get("IVORYPAY_SECRET_KEY");
    if (!IVORYPAY_SECRET_KEY) {
      throw new Error("IVORYPAY_SECRET_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { ncAmount, currency, bankCode, accountNumber, accountName } = await req.json();

    // Validate inputs
    if (!ncAmount || ncAmount < 100) {
      return new Response(
        JSON.stringify({ error: "Minimum withdrawal is NC 100" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!currency || !bankCode || !accountNumber || !accountName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: currency, bankCode, accountNumber, accountName" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check user balance
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("wallet_balance, balance_withdrawable")
      .eq("user_id", user.id)
      .single();

    if (!profile || (profile.balance_withdrawable || 0) < ncAmount) {
      return new Response(
        JSON.stringify({ error: "Insufficient withdrawable balance" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Convert NC → USDT (1 USDT ≈ 1600 NC), then USDT → local fiat (approximate rates)
    const usdtAmount = ncAmount / 1600;
    const usdtToFiat: Record<string, number> = {
      NGN: 1600,
      GHS: 12,
      KES: 130,
      ZAR: 18,
      USD: 1,
    };
    const fiatAmount = Math.round(usdtAmount * (usdtToFiat[currency] || 1) * 100) / 100;
    const reference = crypto.randomUUID();

    // Debit user balance first
    await supabaseService
      .from("profiles")
      .update({
        wallet_balance: (profile.wallet_balance || 0) - ncAmount,
        balance_withdrawable: (profile.balance_withdrawable || 0) - ncAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // Record pending transaction
    await supabaseService.from("wallet_transactions").insert({
      user_id: user.id,
      amount: -ncAmount,
      transaction_type: "withdrawal_pending",
      description: `IvoryPay withdrawal: NC ${ncAmount.toLocaleString()} → ${fiatAmount} ${currency} (pending)`,
      reference,
      status: "pending",
    });

    // POST /v1/fiat-transfer — fiat payout (amount is in fiatCurrency)
    const ivoryResponse = await fetch(`${IVORYPAY_BASE_URL}/v1/fiat-transfer`, {
      method: "POST",
      headers: {
        Authorization: IVORYPAY_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: fiatAmount,
        token: "USDT",
        fiatCurrency: currency,
        payoutMethod: "BANK_TRANSFER",
        accountNumber,
        bankCode,
        accountName,
        reference,
        narration: `NaijaLancers withdrawal - ${reference.slice(0, 8)}`,
      }),
    });

    const ivoryData = await ivoryResponse.json();
    console.log("[IVORYPAY-WITHDRAWAL] Response:", JSON.stringify(ivoryData));

    if (!ivoryResponse.ok || (!ivoryData.success && !ivoryData.status && !ivoryData.data)) {
      // Refund user on failure
      await supabaseService
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0),
          balance_withdrawable: (profile.balance_withdrawable || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await supabaseService
        .from("wallet_transactions")
        .update({
          status: "failed",
          transaction_type: "withdrawal_failed",
          description: `IvoryPay withdrawal failed: ${ivoryData.message || "Unknown error"}`,
        })
        .eq("reference", reference)
        .eq("user_id", user.id);

      throw new Error(ivoryData.message || "Withdrawal failed");
    }

    // Update transaction to completed
    await supabaseService
      .from("wallet_transactions")
      .update({
        status: "completed",
        transaction_type: "withdrawal",
        description: `IvoryPay withdrawal: NC ${ncAmount.toLocaleString()} → ${accountNumber} (${currency})`,
      })
      .eq("reference", reference)
      .eq("user_id", user.id);

    // Record in crypto_transactions
    await supabaseService.from("crypto_transactions").insert({
      user_id: user.id,
      crypto_amount: usdtAmount,
      crypto_currency: "USDT",
      nc_amount: ncAmount,
      naira_amount: ncAmount,
      exchange_rate: 1600,
      transaction_type: "withdrawal",
      status: "completed",
      tx_hash: reference,
      wallet_address: `${bankCode}:${accountNumber}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        ncAmount,
        usdtAmount,
        message: `NC ${ncAmount.toLocaleString()} withdrawal to ${accountNumber} is being processed`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[IVORYPAY-WITHDRAWAL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process withdrawal" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
