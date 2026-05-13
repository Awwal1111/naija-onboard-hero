import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1 USDT ≈ 1600 NC (matches the rest of the platform)
const NC_PER_USDT = 1600;
const USDT_PER_FIAT: Record<string, number> = {
  NGN: 1 / 1600, KES: 1 / 130, GHS: 1 / 12, UGX: 1 / 3800,
  MWK: 1 / 1700, CDF: 1 / 2800, ETB: 1 / 130,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("ref");
    const payload = await req.json().catch(() => ({}));

    console.log("[PRETIUM-WEBHOOK] payload:", JSON.stringify(payload), "ref:", reference);

    const status = String(payload.status || "").toUpperCase();
    const txCode = payload.transaction_code || null;
    const receipt = payload.receipt_number || null;
    const isReleased = payload.is_released === true;

    // Find the pretium row by reference (preferred) or transaction_code
    let q = supabase.from("pretium_transactions")
      .select("id, user_id, type, currency, fiat_amount, asset, asset_amount, status, metadata")
      .limit(1);
    if (reference) q = q.eq("reference", reference);
    else if (txCode) q = q.eq("transaction_code", txCode);
    const { data: rows } = await q;
    const row = rows?.[0];
    if (!row) {
      console.warn("[PRETIUM-WEBHOOK] no matching tx for ref/txCode");
      return new Response("ok", { headers: corsHeaders });
    }

    // Update the pretium tx itself
    const newStatus = isReleased ? "released" : (status === "COMPLETE" ? "complete" : status.toLowerCase() || row.status);
    await supabase.from("pretium_transactions").update({
      status: newStatus,
      receipt_number: receipt,
      is_released: isReleased || row.status === "released",
      transaction_code: txCode || (row as any).transaction_code,
      metadata: { ...(row.metadata || {}), webhook: payload, last_event_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    // ===== Off-ramp NGN: mark wallet_transactions completed when COMPLETE =====
    if (row.type === "offramp" && status === "COMPLETE" && reference) {
      await supabase.from("wallet_transactions").update({
        status: "completed",
        kind: "withdrawal",
        metadata: { provider: "pretium", receipt_number: receipt, completed_at: new Date().toISOString() },
      }).eq("reference", reference).eq("user_id", row.user_id);
    }

    // ===== On-ramp: when funds released to user wallet, credit NC balance =====
    if (row.type === "onramp" && (isReleased || status === "COMPLETE")) {
      // Only credit on the asset-release event (final), not the first collection event.
      const shouldCredit = isReleased && row.status !== "released";
      if (shouldCredit) {
        const fiat = Number(row.fiat_amount || 0);
        const usdt = fiat * (USDT_PER_FIAT[row.currency] || 0);
        const nc = Math.round(usdt * NC_PER_USDT);

        if (nc > 0) {
          const { data: profile } = await supabase
            .from("profiles").select("wallet_balance, balance_withdrawable")
            .eq("user_id", row.user_id).single();
          if (profile) {
            await supabase.from("profiles").update({
              wallet_balance: (profile.wallet_balance || 0) + nc,
              balance_withdrawable: (profile.balance_withdrawable || 0) + nc,
              updated_at: new Date().toISOString(),
            }).eq("user_id", row.user_id);

            await supabase.from("wallet_transactions").insert({
              user_id: row.user_id,
              amount: nc,
              currency: "NC",
              kind: "deposit",
              status: "completed",
              reference: reference || crypto.randomUUID(),
              metadata: {
                provider: "pretium", fiat_currency: row.currency, fiat_amount: fiat,
                receipt_number: receipt, transaction_code: txCode,
              },
            });
          }
        }
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err: any) {
    console.error("[PRETIUM-WEBHOOK] error:", err?.message);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
