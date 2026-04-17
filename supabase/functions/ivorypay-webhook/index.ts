import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ivorypay-signature",
};

// HMAC-SHA512 of body.data, signed with the secret API key
async function verifySignature(dataObj: unknown, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(JSON.stringify(dataObj)));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IVORYPAY_SECRET_KEY = Deno.env.get("IVORYPAY_SECRET_KEY");
    if (!IVORYPAY_SECRET_KEY) throw new Error("IVORYPAY_SECRET_KEY not configured");

    const rawBody = await req.text();
    const signature = req.headers.get("x-ivorypay-signature") || "";
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const valid = await verifySignature(payload?.data, signature, IVORYPAY_SECRET_KEY);
    if (!valid) {
      console.warn("[IVORYPAY-WEBHOOK] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const event: string = payload.event;
    const data = payload.data || {};
    const reference: string = data.reference;
    const status: string = data.status;

    console.log(`[IVORYPAY-WEBHOOK] event=${event} ref=${reference} status=${status}`);

    if (!reference || !event) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Idempotency: insert (reference, event) — duplicates will fail with 23505
    const { error: dupErr } = await supabase.from("ivorypay_webhook_events").insert({
      reference,
      event,
      status: status || "UNKNOWN",
      payload,
    });

    if (dupErr) {
      if ((dupErr as any).code === "23505") {
        console.log("[IVORYPAY-WEBHOOK] Duplicate event ignored");
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw dupErr;
    }

    // ===== Handle deposit success (fiat or crypto collection) =====
    const isCollectionSuccess =
      (event === "fiatCollection.success" ||
        event === "cryptoCollection.success" ||
        event === "permanentWalletDeposit.success") &&
      status === "SUCCESS";

    if (isCollectionSuccess) {
      // Find pending wallet_transaction with this reference
      const { data: pending } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, status")
        .eq("reference", reference)
        .maybeSingle();

      if (pending && pending.status !== "completed") {
        const settledCrypto = parseFloat(
          data.settledAmountInCrypto || data.receivedAmountInCrypto || "0"
        );
        const ncAmount = Math.floor(settledCrypto * 1600);

        if (ncAmount > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance, balance_withdrawable")
            .eq("user_id", pending.user_id)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({
                wallet_balance: (profile.wallet_balance || 0) + ncAmount,
                balance_withdrawable: (profile.balance_withdrawable || 0) + ncAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", pending.user_id);
          }

          await supabase
            .from("wallet_transactions")
            .update({
              amount: ncAmount,
              status: "completed",
              transaction_type: "deposit",
              description: `IvoryPay deposit (webhook): ${settledCrypto} ${data.token || "USDT"} → NC ${ncAmount.toLocaleString()}`,
            })
            .eq("id", pending.id);

          await supabase.from("crypto_transactions").insert({
            user_id: pending.user_id,
            crypto_amount: settledCrypto,
            crypto_currency: data.token || "USDT",
            nc_amount: ncAmount,
            naira_amount: ncAmount,
            exchange_rate: 1600,
            transaction_type: "deposit",
            status: "completed",
            tx_hash: data.cryptoTransactionHash || reference,
            wallet_address: data.address || "ivorypay_checkout",
          });
        }
      }
    }

    // ===== Handle payout success / failure =====
    if (event === "fiatPayout.success" || event === "cryptoPayout.success") {
      await supabase
        .from("wallet_transactions")
        .update({ status: "completed", transaction_type: "withdrawal" })
        .eq("reference", reference);
    }

    if (event === "fiatPayout.failed" || event === "cryptoPayout.failed") {
      // Refund the user
      const { data: tx } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, amount, status")
        .eq("reference", reference)
        .maybeSingle();

      if (tx && tx.status !== "failed" && tx.status !== "completed") {
        const refundAmount = Math.abs(tx.amount || 0);
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance, balance_withdrawable")
          .eq("user_id", tx.user_id)
          .single();

        if (profile && refundAmount > 0) {
          await supabase
            .from("profiles")
            .update({
              wallet_balance: (profile.wallet_balance || 0) + refundAmount,
              balance_withdrawable: (profile.balance_withdrawable || 0) + refundAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", tx.user_id);
        }

        await supabase
          .from("wallet_transactions")
          .update({
            status: "failed",
            transaction_type: "withdrawal_failed",
            description: `IvoryPay payout failed: ${data.failureReason || "unknown"} (refunded)`,
          })
          .eq("id", tx.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[IVORYPAY-WEBHOOK] Error:", error);
    // Still return 200 to prevent IvoryPay retry storms on our own bugs;
    // duplicates are protected by the unique constraint.
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
