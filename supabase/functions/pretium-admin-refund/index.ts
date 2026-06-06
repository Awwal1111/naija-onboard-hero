// Admin-only edge function to investigate and refund stuck/failed Pretium transactions.
// Pretium does not expose a public refund endpoint — this function:
//   1. Looks up our Pretium transaction row (by our id OR Pretium transaction_code).
//   2. Optionally queries Pretium's status endpoint to confirm upstream state.
//   3. If approved, credits the user's NC wallet, marks the row refunded, and
//      writes a full audit trail.
//
// Auth: caller must have 'admin', 'super_admin' or 'moderator' role.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PRETIUM_BASE = "https://api.xwift.africa";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function pretiumStatus(transactionCode: string) {
  const key = Deno.env.get("PRETIUM_CONSUMER_KEY")?.trim();
  if (!key) return { ok: false, error: "PRETIUM_CONSUMER_KEY not configured" };
  const paths = [
    `/v1/transaction/${transactionCode}`,
    `/v1/transactions/${transactionCode}`,
    `/v1/offramp/${transactionCode}`,
    `/v1/onramp/${transactionCode}`,
  ];
  const tried: any[] = [];
  for (const p of paths) {
    try {
      const r = await fetch(`${PRETIUM_BASE}${p}`, {
        method: "GET",
        headers: { "x-api-key": key },
      });
      const text = await r.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      tried.push({ path: p, status: r.status, data });
      if (r.ok) return { ok: true, data, path: p, tried };
    } catch (e) {
      tried.push({ path: p, error: (e as Error).message });
    }
  }
  return { ok: false, error: "All Pretium status lookups failed", tried };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callerId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin") || roles.includes("moderator");
    if (!isAdmin) return json({ error: "Admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "lookup");
    const id = body.id?.toString();
    const code = body.transaction_code?.toString();
    if (!id && !code) return json({ error: "Provide id or transaction_code" }, 400);

    let query = supabaseAdmin
      .from("pretium_transactions")
      .select("id, user_id, transaction_code, type, currency, fiat_amount, asset, asset_amount, status, is_released, created_at, metadata");
    if (id) query = query.eq("id", id);
    else if (code) query = query.eq("transaction_code", code);
    const { data: tx, error: txErr } = await query.maybeSingle();
    if (txErr) return json({ error: txErr.message }, 500);
    if (!tx) return json({ error: "Transaction not found", searched: { id, code } }, 404);

    const upstream = await pretiumStatus(tx.transaction_code);

    if (action === "lookup") return json({ tx, upstream });
    if (action !== "refund") return json({ error: `Unknown action: ${action}` }, 400);

    if (tx.status === "refunded") return json({ ok: false, error: "Already refunded", tx });
    const amountNc = Number(tx.fiat_amount || 0);
    if (!amountNc || amountNc <= 0) return json({ error: "Invalid amount" }, 400);

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("user_id, wallet_balance")
      .eq("user_id", tx.user_id).maybeSingle();
    if (pErr || !profile) return json({ error: "User profile not found" }, 404);

    const newBalance = Number(profile.wallet_balance || 0) + amountNc;
    const { error: updErr } = await supabaseAdmin
      .from("profiles").update({ wallet_balance: newBalance })
      .eq("user_id", tx.user_id);
    if (updErr) return json({ error: `Wallet credit failed: ${updErr.message}` }, 500);

    const newMeta = {
      ...(tx.metadata || {}),
      refund: { by: callerId, at: new Date().toISOString(), reason: body.reason || null, upstream },
    };
    await supabaseAdmin.from("pretium_transactions")
      .update({ status: "refunded", metadata: newMeta }).eq("id", tx.id);

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: tx.user_id,
      type: "credit",
      amount: amountNc,
      description: `Pretium refund for ${tx.transaction_code} (admin reversal)`,
      category: "refund",
      reference: tx.transaction_code,
      status: "completed",
    });
    await supabaseAdmin.from("audit_logs").insert({
      user_id: callerId,
      action: "pretium_admin_refund",
      resource_type: "pretium_transactions",
      resource_id: tx.id,
      metadata: { amount: amountNc, target_user: tx.user_id, reason: body.reason || null },
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: tx.user_id,
      type: "wallet_credit",
      title: "Refund credited to your NC wallet",
      message: `We refunded NC ${amountNc.toLocaleString()} for your ${tx.type} transaction (${tx.transaction_code}). New balance: NC ${newBalance.toLocaleString()}.`,
      data: { transaction_code: tx.transaction_code, amount: amountNc },
    });

    return json({ ok: true, refunded: amountNc, new_balance: newBalance, tx_id: tx.id });
  } catch (e) {
    console.error("[pretium-admin-refund] error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
