import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRETIUM_BASE = "https://api.xwift.africa";

// Approximate USDT→fiat rates used as fallback when the live exchange-rate
// endpoint fails. Values intentionally conservative.
const USDT_TO_FIAT: Record<string, number> = {
  NGN: 1600, KES: 130, GHS: 12, UGX: 3800, MWK: 1700, CDF: 2800, ETB: 130,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PRETIUM_KEY = Deno.env.get("PRETIUM_CONSUMER_KEY")?.trim();
    if (!PRETIUM_KEY) throw new Error("PRETIUM_CONSUMER_KEY not configured");

    const callPretium = async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("x-api-key", PRETIUM_KEY);
      if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      const resp = await fetch(`${PRETIUM_BASE}${path}`, { ...init, headers });
      const text = await resp.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
      return { resp, data, raw: text };
    };

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---------- Public lookups ----------
    if (action === "banks") {
      const { resp, data, raw } = await callPretium("/v1/banks", { method: "POST" });
      if (!resp.ok) return json({ success: false, error: data?.message || raw });
      return json({ success: true, banks: data?.data || [] });
    }

    if (action === "validateAccount") {
      const { account_number, bank_code, currency = "NGN" } = body;
      if (!account_number || !bank_code) return json({ error: "account_number and bank_code required" }, 400);
      const { resp, data, raw } = await callPretium(`/v1/validation/${currency}`, {
        method: "POST",
        body: JSON.stringify({ account_number: String(account_number), bank_code: String(bank_code) }),
      });
      if (!resp.ok || data?.code && data.code >= 400) {
        return json({ success: false, error: data?.message || raw });
      }
      return json({ success: true, ...data?.data });
    }

    if (action === "exchangeRate") {
      const { currency_code } = body;
      const { resp, data, raw } = await callPretium("/v1/exchange-rate", {
        method: "POST",
        body: JSON.stringify({ currency_code }),
      });
      if (!resp.ok) return json({ success: false, error: data?.message || raw });
      return json({ success: true, ...data?.data });
    }

    // ---------- Off-ramp NGN: convert NC → bank ----------
    if (action === "offrampNGN") {
      const { ncAmount, account_name, account_number, bank_name, bank_code } = body;
      if (!ncAmount || ncAmount < 1000) return json({ error: "Minimum withdrawal is NC 1000" }, 400);
      if (!account_number || !bank_code || !account_name || !bank_name) {
        return json({ error: "Missing bank details" }, 400);
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance, balance_withdrawable")
        .eq("user_id", user.id)
        .single();
      if (!profile || (profile.balance_withdrawable || 0) < ncAmount) {
        return json({ error: "Insufficient withdrawable balance" }, 400);
      }

      // 1 USDT ≈ 1600 NC ≈ ₦1600
      const usdtAmount = Number(ncAmount) / 1600;
      const fiatAmount = Math.round(usdtAmount * (USDT_TO_FIAT.NGN || 1600));
      const reference = crypto.randomUUID();

      // Debit user
      await supabaseAdmin
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0) - ncAmount,
          balance_withdrawable: (profile.balance_withdrawable || 0) - ncAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: -ncAmount,
        currency: "NC",
        kind: "withdrawal_pending",
        status: "pending",
        reference,
        metadata: { provider: "pretium", fiat_currency: "NGN", fiat_amount: fiatAmount, bank_code, account_number },
      });

      const refund = async (msg: string) => {
        const { data: cur } = await supabaseAdmin
          .from("profiles").select("wallet_balance, balance_withdrawable")
          .eq("user_id", user.id).single();
        if (cur) {
          await supabaseAdmin.from("profiles").update({
            wallet_balance: (cur.wallet_balance || 0) + ncAmount,
            balance_withdrawable: (cur.balance_withdrawable || 0) + ncAmount,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
        }
        await supabaseAdmin.from("wallet_transactions").update({
          status: "failed", kind: "withdrawal_failed",
          metadata: { provider: "pretium", error: msg, refunded: true },
        }).eq("reference", reference).eq("user_id", user.id);
      };

      // Settlement: master wallet sends USDT to Pretium settlement address.
      // We invoke our existing celo-master-transfer edge function for the on-chain step.
      const settlementAddress = Deno.env.get("PRETIUM_SETTLEMENT_ADDRESS")?.trim();
      if (!settlementAddress) {
        await refund("PRETIUM_SETTLEMENT_ADDRESS not configured");
        return json({ error: "Pretium settlement address not configured. Contact admin." }, 500);
      }

      let txHash: string | null = null;
      try {
        const transferResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/celo-master-transfer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              to: settlementAddress,
              amount: usdtAmount.toFixed(6),
              token: "USDT",
            }),
          }
        );
        const transferData = await transferResp.json().catch(() => ({}));
        txHash = transferData?.txHash || transferData?.hash || transferData?.transaction_hash || null;
        if (!transferResp.ok || !txHash) {
          throw new Error(transferData?.error || "On-chain settlement failed");
        }
      } catch (err: any) {
        // No master-transfer function available — log a placeholder and let
        // ops settle manually. We still record the row so support can finish it.
        console.error("[PRETIUM-RAMP] settlement transfer failed:", err?.message);
        await refund(`Settlement transfer failed: ${err?.message || "unknown"}`);
        return json({ error: "Could not settle on-chain. Try again or use crypto withdrawal." }, 500);
      }

      const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pretium-webhook?ref=${reference}`;
      const { resp: payResp, data: payData, raw: payRaw } = await callPretium("/v1/pay/NGN", {
        method: "POST",
        body: JSON.stringify({
          type: "BANK_TRANSFER",
          account_name, account_number, bank_name,
          bank_code: String(bank_code),
          amount: String(fiatAmount),
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: callbackUrl,
        }),
      });

      if (!payResp.ok || payData?.code >= 400) {
        const msg = payData?.message || payRaw || "Pretium payout failed";
        await refund(msg);
        return json({ error: msg }, 502);
      }

      const txCode = payData?.data?.transaction_code || null;
      await supabaseAdmin.from("pretium_transactions").insert({
        user_id: user.id,
        reference,
        transaction_code: txCode,
        type: "offramp",
        currency: "NGN",
        fiat_amount: fiatAmount,
        asset: "USDT",
        asset_amount: usdtAmount,
        chain: "CELO",
        status: "pending",
        bank_code: String(bank_code),
        account_number: String(account_number),
        account_name,
        transaction_hash: txHash,
        metadata: { bank_name, ncAmount },
      });

      await supabaseAdmin.from("wallet_transactions").update({
        kind: "withdrawal",
        metadata: {
          provider: "pretium", fiat_currency: "NGN", fiat_amount: fiatAmount,
          bank_code, account_number, account_name,
          transaction_code: txCode, transaction_hash: txHash,
          submitted_at: new Date().toISOString(),
        },
      }).eq("reference", reference).eq("user_id", user.id);

      return json({
        success: true, reference, transaction_code: txCode, fiatAmount,
        message: `₦${fiatAmount.toLocaleString()} withdrawal to ${account_number} is processing`,
      });
    }

    // ---------- On-ramp (mobile money): KES/GHS/UGX/MWK/CDF/ETB ----------
    if (action === "onramp") {
      const { currency, shortcode, amount, mobile_network, asset = "USDT" } = body;
      if (!currency || !shortcode || !amount || !mobile_network) {
        return json({ error: "currency, shortcode, amount, mobile_network are required" }, 400);
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles").select("celo_wallet_address").eq("user_id", user.id).maybeSingle();
      let address = (profile as any)?.celo_wallet_address;
      if (!address) {
        // Provision wallet if missing
        const wresp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-user-wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
        });
        const wdata = await wresp.json().catch(() => ({}));
        address = wdata?.address;
        if (!address) return json({ error: "Could not provision wallet" }, 500);
      }

      const reference = crypto.randomUUID();
      const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pretium-webhook?ref=${reference}`;

      const { resp, data, raw } = await callPretium(`/v1/onramp/${currency}`, {
        method: "POST",
        body: JSON.stringify({
          shortcode: String(shortcode),
          amount: Number(amount),
          mobile_network: String(mobile_network),
          chain: "CELO",
          asset: String(asset),
          address,
          callback_url: callbackUrl,
        }),
      });

      if (!resp.ok || data?.code >= 400) {
        return json({ error: data?.message || raw || "Onramp failed" }, 502);
      }

      const txCode = data?.data?.transaction_code || null;
      await supabaseAdmin.from("pretium_transactions").insert({
        user_id: user.id,
        reference,
        transaction_code: txCode,
        type: "onramp",
        currency,
        fiat_amount: Number(amount),
        asset,
        chain: "CELO",
        status: "pending",
        recipient_address: address,
        metadata: { shortcode, mobile_network },
      });

      return json({
        success: true, reference, transaction_code: txCode,
        message: data?.data?.message || "Prompt sent. Approve on your phone to complete the deposit.",
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[PRETIUM-RAMP] error:", err?.message);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
