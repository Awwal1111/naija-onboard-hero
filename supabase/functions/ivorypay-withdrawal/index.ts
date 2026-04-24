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

    const body = await req.json();
    const { action, ncAmount, currency, bankCode, accountNumber, accountName } = body;

    // ============= listBanks: proxy IvoryPay's banks list so the user picks valid codes =============
    if (action === "listBanks") {
      const cur = currency || "NGN";
      const banksResp = await fetch(
        `${IVORYPAY_BASE_URL}/v1/fiat-transfer/banks?currency=${encodeURIComponent(cur)}`,
        { headers: { Authorization: IVORYPAY_SECRET_KEY } }
      );
      const banksData = await banksResp.json();
      console.log("[IVORYPAY-WITHDRAWAL] listBanks", cur, "status:", banksResp.status);
      if (!banksResp.ok) {
        return new Response(
          JSON.stringify({ error: banksData.message || "Failed to fetch banks" }),
          { status: banksResp.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const list = Array.isArray(banksData.data) ? banksData.data : (banksData.data?.banks || []);
      return new Response(
        JSON.stringify({ success: true, banks: list }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============= resolveAccount: validate the account name BEFORE the user submits =============
    if (action === "resolveAccount") {
      if (!bankCode || !accountNumber || !currency) {
        return new Response(
          JSON.stringify({ error: "currency, bankCode and accountNumber are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const resp = await fetch(`${IVORYPAY_BASE_URL}/v1/fiat-transfer/account-resolution`, {
        method: "POST",
        headers: { Authorization: IVORYPAY_SECRET_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode, currency }),
      });
      const respData = await resp.json();
      console.log("[IVORYPAY-WITHDRAWAL] resolveAccount status:", resp.status, JSON.stringify(respData));
      if (!resp.ok || respData.status === false || respData.success === false) {
        return new Response(
          JSON.stringify({
            success: false,
            error: respData.message || respData.error || "Could not verify account",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          accountName: respData.data?.accountName || respData.data?.account_name || null,
          bankName: respData.data?.bankName || respData.data?.bank_name || null,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============= Default action: process the actual withdrawal =============
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

    // Record pending transaction (correct schema: kind, currency, metadata)
    await supabaseService.from("wallet_transactions").insert({
      user_id: user.id,
      amount: -ncAmount,
      currency: "NC",
      kind: "withdrawal_pending",
      status: "pending",
      reference,
      metadata: {
        provider: "ivorypay",
        fiat_currency: currency,
        fiat_amount: fiatAmount,
        bank_code: bankCode,
        account_number: accountNumber,
      },
    });

    // Helper to safely refund the user (re-reads current balances to avoid races)
    const refundUser = async (errorMsg: string) => {
      const { data: current } = await supabaseService
        .from("profiles")
        .select("wallet_balance, balance_withdrawable")
        .eq("user_id", user.id)
        .single();
      if (current) {
        await supabaseService
          .from("profiles")
          .update({
            wallet_balance: (current.wallet_balance || 0) + ncAmount,
            balance_withdrawable: (current.balance_withdrawable || 0) + ncAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
      await supabaseService
        .from("wallet_transactions")
        .update({
          status: "failed",
          kind: "withdrawal_failed",
          metadata: { provider: "ivorypay", error: errorMsg, refunded: true },
        })
        .eq("reference", reference)
        .eq("user_id", user.id);
    };

    // Step 1: Resolve account name to validate before sending money
    const resolveResp = await fetch(`${IVORYPAY_BASE_URL}/v1/fiat-transfer/account-resolution`, {
      method: "POST",
      headers: { Authorization: IVORYPAY_SECRET_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber, bankCode, currency }),
    });
    const resolveData = await resolveResp.json();
    console.log("[IVORYPAY-WITHDRAWAL] Account resolution status:", resolveResp.status, "body:", JSON.stringify(resolveData));

    if (!resolveResp.ok || resolveData.status === false || resolveData.success === false) {
      const msg = resolveData.message || resolveData.error || `Account resolution failed (HTTP ${resolveResp.status})`;
      await refundUser(msg);
      throw new Error(msg);
    }

    // Step 2: Initiate the fiat payout
    const ivoryResponse = await fetch(`${IVORYPAY_BASE_URL}/v1/fiat-transfer`, {
      method: "POST",
      headers: { Authorization: IVORYPAY_SECRET_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: fiatAmount,
        token: "USDT",
        fiatCurrency: currency,
        payoutMethod: "BANK_TRANSFER",
        accountNumber,
        bankCode,
        reference,
      }),
    });

    const ivoryData = await ivoryResponse.json();
    console.log("[IVORYPAY-WITHDRAWAL] Payout response status:", ivoryResponse.status, "body:", JSON.stringify(ivoryData));

    // IvoryPay returns { status: true, data: {...} } on success
    const payoutOk = ivoryResponse.ok && (ivoryData.status === true || ivoryData.success === true);

    if (!payoutOk) {
      const msg = ivoryData.message || ivoryData.error || `Payout failed (HTTP ${ivoryResponse.status})`;
      await refundUser(msg);
      throw new Error(msg);
    }

    // Payout accepted — keep status pending until webhook confirms SUCCESS/FAILED
    // (do NOT mark completed here, do NOT insert crypto_transactions yet)
    await supabaseService
      .from("wallet_transactions")
      .update({
        kind: "withdrawal",
        metadata: {
          provider: "ivorypay",
          fiat_currency: currency,
          fiat_amount: fiatAmount,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: resolveData.data?.accountName || accountName,
          payout_id: ivoryData.data?.id,
          submitted_at: new Date().toISOString(),
        },
      })
      .eq("reference", reference)
      .eq("user_id", user.id);

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
