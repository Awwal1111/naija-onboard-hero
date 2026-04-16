import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IVORYPAY_API_URL = "https://api.ivorypay.io/api/v1";

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

    const { action, amount, currency, reference } = await req.json();

    if (action === "initiate") {
      // Validate inputs
      if (!amount || amount <= 0) {
        throw new Error("Invalid amount");
      }

      const baseFiat = currency || "NGN";
      const paymentReference = reference || crypto.randomUUID();

      // Get user profile for email
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: profile } = await supabaseService
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", user.id)
        .single();

      const nameParts = (profile?.full_name || profile?.username || "User").split(" ");

      // Create IvoryPay transaction using CHECKOUT mode
      const ivoryResponse = await fetch(`${IVORYPAY_API_URL}/transactions`, {
        method: "POST",
        headers: {
          Authorization: IVORYPAY_SECRET_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          email: user.email,
          firstName: nameParts[0] || "User",
          lastName: nameParts.slice(1).join(" ") || "NaijaLancers",
          type: "CRYPTO",
          mode: "CHECKOUT",
          baseFiat: baseFiat,
          crypto: "USDT",
          reference: paymentReference,
          redirect_url: `https://naijalancers.lovable.app/wallet?ivorypay_ref=${paymentReference}`,
          metadata: JSON.stringify({
            user_id: user.id,
            nc_deposit: true,
            fiat_currency: baseFiat,
            fiat_amount: amount,
          }),
        }),
      });

      const ivoryData = await ivoryResponse.json();
      console.log("[IVORYPAY] Transaction response:", JSON.stringify(ivoryData));

      if (!ivoryData.success && !ivoryData.data) {
        throw new Error(ivoryData.message || "Failed to create IvoryPay transaction");
      }

      // Record the pending transaction
      await supabaseService.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 0, // Will be updated on confirmation
        transaction_type: "deposit_pending",
        description: `IvoryPay deposit: ${amount} ${baseFiat} (pending)`,
        reference: paymentReference,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: ivoryData.data?.checkoutUrl,
          reference: paymentReference,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "verify") {
      if (!reference) {
        throw new Error("Reference is required");
      }

      // Verify transaction status with IvoryPay (public endpoint, no auth needed)
      const verifyResponse = await fetch(
        `${IVORYPAY_API_URL}/transactions/${reference}/verify`
      );

      const verifyData = await verifyResponse.json();
      console.log("[IVORYPAY] Verify response:", JSON.stringify(verifyData));

      if (verifyData.success && verifyData.data?.status === "SUCCESS") {
        const supabaseService = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check if already credited
        const { data: existing } = await supabaseService
          .from("wallet_transactions")
          .select("id, status")
          .eq("reference", reference)
          .eq("user_id", user.id)
          .single();

        if (existing && existing.status === "completed") {
          return new Response(
            JSON.stringify({ success: true, message: "Already credited", status: "SUCCESS" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Calculate NC amount from settled crypto
        const settledCrypto = verifyData.data.settledAmountInCrypto || 0;
        // 1 USDT ≈ 1 USD ≈ 1600 NC
        const ncAmount = Math.floor(settledCrypto * 1600);

        if (ncAmount > 0) {
          // Credit user balance
          const { data: profile } = await supabaseService
            .from("profiles")
            .select("wallet_balance, balance_withdrawable")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            await supabaseService
              .from("profiles")
              .update({
                wallet_balance: (profile.wallet_balance || 0) + ncAmount,
                balance_withdrawable: (profile.balance_withdrawable || 0) + ncAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);
          }

          // Update transaction record
          await supabaseService
            .from("wallet_transactions")
            .update({
              amount: ncAmount,
              status: "completed",
              transaction_type: "deposit",
              description: `IvoryPay deposit: ${settledCrypto} USDT → NC ${ncAmount.toLocaleString()}`,
            })
            .eq("reference", reference)
            .eq("user_id", user.id);

          // Also record in crypto_transactions
          await supabaseService.from("crypto_transactions").insert({
            user_id: user.id,
            crypto_amount: settledCrypto,
            crypto_currency: verifyData.data.currency || "USDT",
            nc_amount: ncAmount,
            naira_amount: ncAmount,
            exchange_rate: 1600,
            transaction_type: "deposit",
            status: "completed",
            tx_hash: reference,
            wallet_address: "ivorypay_checkout",
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: "SUCCESS",
            ncAmount,
            settledCrypto,
            message: `NC ${ncAmount.toLocaleString()} credited to your wallet`,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: verifyData.data?.status || "PENDING",
          message: "Transaction not yet confirmed",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid action. Use 'initiate' or 'verify'");
  } catch (error: any) {
    console.error("[IVORYPAY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
