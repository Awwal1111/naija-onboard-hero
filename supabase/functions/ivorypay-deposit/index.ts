import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IVORYPAY_BASE_URL = "https://api.ivorypay.io/api";
const APP_URL = "https://naijalancers.name.ng/payment-success";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IVORYPAY_SECRET_KEY = Deno.env.get("IVORYPAY_SECRET_KEY");
    if (!IVORYPAY_SECRET_KEY) throw new Error("IVORYPAY_SECRET_KEY is not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { action, amount, currency, reference } = await req.json();

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "initiate") {
      if (!amount || amount <= 0) throw new Error("Invalid amount");

      const baseFiat = currency || "NGN";
      const paymentReference = reference || crypto.randomUUID();

      const { data: profile } = await supabaseService
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", user.id)
        .single();

      const nameParts = (profile?.full_name || profile?.username || "User").split(" ");

      const ivoryResponse = await fetch(`${IVORYPAY_BASE_URL}/v1/transactions`, {
        method: "POST",
        headers: { Authorization: IVORYPAY_SECRET_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          email: user.email,
          firstName: nameParts[0] || "User",
          lastName: nameParts.slice(1).join(" ") || "NaijaLancers",
          type: "FIAT",
          mode: "CHECKOUT",
          baseFiat,
          crypto: "USDT",
          reference: paymentReference,
          redirect_url: `${APP_URL}`,
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

      if (!ivoryResponse.ok) {
        throw new Error(ivoryData.message || ivoryData.error || "Failed to create IvoryPay transaction");
      }

      const checkoutUrl =
        ivoryData.data?.checkoutUrl ||
        ivoryData.data?.checkout_url ||
        ivoryData.data?.paymentUrl ||
        ivoryData.data?.url;

      if (!checkoutUrl) {
        console.error("[IVORYPAY] No checkout URL in response:", JSON.stringify(ivoryData));
        throw new Error("IvoryPay did not return a checkout URL");
      }

      // Insert pending transaction with CORRECT schema (kind, currency, metadata)
      const { error: txErr } = await supabaseService.from("wallet_transactions").insert({
        user_id: user.id,
        amount: 0,
        currency: "NC",
        kind: "deposit_pending",
        status: "pending",
        reference: paymentReference,
        metadata: {
          provider: "ivorypay",
          fiat_currency: baseFiat,
          fiat_amount: amount,
        },
      });
      if (txErr) console.error("[IVORYPAY] insert pending tx error:", txErr);

      return new Response(
        JSON.stringify({ success: true, checkoutUrl, reference: paymentReference }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "verify") {
      if (!reference) throw new Error("Reference is required");

        const verifyResponse = await fetch(
          `${IVORYPAY_BASE_URL}/v1/transactions/${reference}/verify`,
          { headers: { Authorization: IVORYPAY_SECRET_KEY } }
        );

      const verifyData = await verifyResponse.json();
      console.log("[IVORYPAY] Verify response:", JSON.stringify(verifyData));

        const txStatus = verifyData.data?.status;
      const isSuccess = txStatus === "SUCCESS";

      if (isSuccess) {
        const { data: existing } = await supabaseService
          .from("wallet_transactions")
          .select("id, status")
          .eq("reference", reference)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing && existing.status === "completed") {
          return new Response(
            JSON.stringify({ success: true, message: "Already credited", status: "SUCCESS" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const settledCrypto =
          parseFloat(verifyData.data?.settledAmountInCrypto || verifyData.data?.receivedAmountInCrypto || verifyData.data?.amountInCrypto || "0");
        const ncAmount = Math.floor(settledCrypto * 1600);

        if (ncAmount > 0) {
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

          if (existing) {
            await supabaseService
              .from("wallet_transactions")
              .update({
                amount: ncAmount,
                status: "completed",
                kind: "deposit",
                metadata: {
                  provider: "ivorypay",
                  settled_crypto: settledCrypto,
                  crypto_currency: verifyData.data.currency || "USDT",
                },
              })
              .eq("id", existing.id);
          } else {
            await supabaseService.from("wallet_transactions").insert({
              user_id: user.id,
              amount: ncAmount,
              currency: "NC",
              kind: "deposit",
              status: "completed",
              reference,
              metadata: { provider: "ivorypay", settled_crypto: settledCrypto },
            });
          }

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
            success: true, status: "SUCCESS", ncAmount, settledCrypto,
            message: `NC ${ncAmount.toLocaleString()} credited to your wallet`,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, status: txStatus || "PENDING", message: "Transaction not yet confirmed" }),
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
