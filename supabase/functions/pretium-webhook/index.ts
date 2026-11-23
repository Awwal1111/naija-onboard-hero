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

    // SECURITY: this endpoint is public (verify_jwt = false) and credits NC, so it
    // must be authenticated. Set PRETIUM_WEBHOOK_SECRET in the Supabase function
    // secrets and add `&secret=<value>` to the callback URL you give Pretium. Until
    // the secret is set this check is skipped (so existing callbacks keep working),
    // but the endpoint is NOT protected until you set it.
    const expectedSecret = Deno.env.get("PRETIUM_WEBHOOK_SECRET");
    if (expectedSecret) {
      const provided = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
      if (provided !== expectedSecret) {
        console.warn("[PRETIUM-WEBHOOK] rejected: bad or missing secret");
        return new Response("unauthorized", { status: 401, headers: corsHeaders });
      }
    } else {
      console.warn("[PRETIUM-WEBHOOK] PRETIUM_WEBHOOK_SECRET is not set: webhook is unauthenticated");
    }

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

    // Claim the on-ramp release atomically: only the first request that moves the row
    // to "released" may credit NC. A replayed or simultaneous webhook finds the row
    // already released and credits nothing.
    let claimedRelease = false;
    if (row.type === "onramp" && isReleased) {
      const { data: claimedRows } = await supabase.from("pretium_transactions")
        .update({ status: "released", updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .neq("status", "released")
        .select("id");
      claimedRelease = (claimedRows?.length ?? 0) > 0;
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
      const shouldCredit = claimedRelease;
      if (shouldCredit) {
        const fiat = Number(row.fiat_amount || 0);
        const usdt = fiat * (USDT_PER_FIAT[row.currency] || 0);
        const nc = Math.round(usdt * NC_PER_USDT);

        if (nc > 0) {
          // Atomic credit (the old read-then-write could lose or double a credit).
          const { data: credited } = await supabase.rpc("credit_user_balances", {
            p_user_id: row.user_id, p_wallet: nc, p_withdrawable: nc,
          });
          if (credited === true) {
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
