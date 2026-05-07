// USDT Charge: deducts NC from the end user (PIN-validated), sends USDT from
// master wallet to a developer-supplied external address, records a ledger
// entry, and delivers a signed webhook so the developer's backend can verify
// the payment server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CELO_RPC = "https://forno.celo.org";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deliverWebhook(url: string, secret: string, payload: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = JSON.stringify(payload);
    const sig = await hmacSha256Hex(secret, body);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naijalancers-Signature": `sha256=${sig}`,
        "X-Naijalancers-Event": "charge.completed",
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "delivery failed" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("No authorization");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { miniAppId, toAddress: rawTo, usdtAmount, pin, requestId } = await req.json();
    if (!miniAppId || !rawTo || !usdtAmount || !pin || !requestId) throw new Error("Missing fields");
    if (typeof requestId !== "string" || requestId.length < 6 || requestId.length > 128) throw new Error("Invalid requestId");
    if (!ethers.isAddress(rawTo)) throw new Error("Invalid destination address");
    const toAddress = ethers.getAddress(rawTo);
    const amount = Number(usdtAmount);
    if (!isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    if (amount < 0.5) throw new Error("Minimum charge is 0.5 USDT");
    if (amount > 5000) throw new Error("Maximum charge is 5000 USDT");

    // Idempotency: if requestId already used, return prior result
    const { data: existing } = await supabase.from("miniapp_charges")
      .select("id, status, tx_hash, nc_amount, usdt_amount, exchange_rate, error")
      .eq("request_id", requestId).maybeSingle();
    if (existing) {
      if (existing.status === "confirmed") {
        return new Response(JSON.stringify({
          success: true, duplicate: true, txHash: existing.tx_hash,
          ncDeducted: existing.nc_amount, usdtAmount: existing.usdt_amount, rate: existing.exchange_rate,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`Duplicate requestId (status: ${existing.status})`);
    }

    // Verify PIN
    const { data: secrets } = await supabase.from("user_secrets")
      .select("transaction_pin").eq("user_id", user.id).maybeSingle();
    if (!secrets?.transaction_pin) throw new Error("Set up your transaction PIN first");
    if (String(secrets.transaction_pin) !== String(pin)) throw new Error("Incorrect PIN");

    // Get mini app + webhook config
    const { data: app } = await supabase.from("mini_apps")
      .select("id, app_name, developer_id, webhook_url, webhook_secret").eq("id", miniAppId).single();
    if (!app) throw new Error("MiniApp not found");

    // NGN rate
    let usdToNgn = 1600;
    try {
      const r = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        if (j.conversion_rates?.NGN) usdToNgn = j.conversion_rates.NGN;
      }
    } catch { /* fallback */ }
    const ncCost = Math.ceil(amount * usdToNgn);

    // Balance check
    const { data: profile } = await supabase.from("profiles")
      .select("wallet_balance, balance_withdrawable").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile missing");
    if ((profile.balance_withdrawable || 0) < ncCost) {
      throw new Error(`Insufficient NC. Need ${ncCost} NC for ${amount} USDT.`);
    }

    // Create pending ledger row (locks the requestId)
    const { data: ledger, error: ledgerErr } = await supabase.from("miniapp_charges").insert({
      request_id: requestId,
      mini_app_id: app.id,
      user_id: user.id,
      to_address: toAddress.toLowerCase(),
      usdt_amount: amount,
      ngn_amount: ncCost,
      nc_amount: ncCost,
      exchange_rate: usdToNgn,
      status: "pending",
    }).select("id").single();
    if (ledgerErr || !ledger) throw new Error("Could not create ledger entry (possible duplicate)");

    // Deduct NC
    await supabase.from("profiles").update({
      wallet_balance: (profile.wallet_balance || 0) - ncCost,
      balance_withdrawable: (profile.balance_withdrawable || 0) - ncCost,
    }).eq("user_id", user.id);

    // On-chain transfer
    let txHash = "";
    try {
      const { data: mw } = await supabase.from("system_settings")
        .select("value").eq("key", "master_wallet_encrypted").single();
      if (!mw?.value) throw new Error("Master wallet not initialized");
      const secret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
      const pk = CryptoJS.AES.decrypt(mw.value, secret).toString(CryptoJS.enc.Utf8);
      if (!pk) throw new Error("Failed to decrypt master wallet");

      const provider = new ethers.JsonRpcProvider(CELO_RPC);
      const wallet = new ethers.Wallet(pk, provider);
      const abi = ["function transfer(address to, uint256 amount) returns (bool)", "function balanceOf(address) view returns (uint256)"];
      const usdt = new ethers.Contract(USDT_ADDRESS, abi, wallet);

      const amountWei = ethers.parseUnits(amount.toFixed(6), 6);
      const masterBal = await usdt.balanceOf(wallet.address);
      if (masterBal < amountWei) throw new Error(`Master wallet low on USDT (has ${Number(masterBal) / 1e6})`);

      const tx = await usdt.transfer(toAddress, amountWei);
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch (chainErr: any) {
      // Refund NC + mark ledger failed
      await supabase.from("profiles").update({
        wallet_balance: profile.wallet_balance || 0,
        balance_withdrawable: profile.balance_withdrawable || 0,
      }).eq("user_id", user.id);
      await supabase.from("miniapp_charges").update({
        status: "failed", error: String(chainErr?.message || chainErr),
      }).eq("id", ledger.id);
      throw new Error(`On-chain send failed: ${chainErr?.message || chainErr}. NC refunded.`);
    }

    // Mark confirmed
    await supabase.from("miniapp_charges").update({ status: "confirmed", tx_hash: txHash }).eq("id", ledger.id);

    // Log existing tables for backwards compat
    await supabase.from("crypto_transactions").insert({
      user_id: user.id, transaction_type: "miniapp_charge", crypto_amount: amount,
      crypto_currency: "USDT", naira_amount: ncCost, nc_amount: ncCost,
      exchange_rate: usdToNgn, wallet_address: toAddress.toLowerCase(),
      tx_hash: txHash, status: "confirmed",
    });
    await supabase.from("wallet_transactions").insert({
      user_id: user.id, kind: "miniapp_charge", amount: -ncCost, status: "completed",
      reference: `MiniApp ${app.app_name}: ${amount} USDT to ${toAddress.slice(0, 8)}... (tx ${txHash.slice(0, 10)}...)`,
    });

    // Signed webhook (best-effort)
    if (app.webhook_url && app.webhook_secret) {
      const payload = {
        event: "charge.completed",
        request_id: requestId,
        mini_app_id: app.id,
        user_id: user.id,
        to_address: toAddress.toLowerCase(),
        usdt_amount: amount,
        nc_amount: ncCost,
        exchange_rate: usdToNgn,
        tx_hash: txHash,
        timestamp: new Date().toISOString(),
      };
      const result = await deliverWebhook(app.webhook_url, app.webhook_secret, payload);
      await supabase.from("miniapp_charges").update({
        webhook_delivered: result.ok,
        webhook_attempts: 1,
        webhook_last_error: result.ok ? null : result.error,
      }).eq("id", ledger.id);
    }

    return new Response(JSON.stringify({
      success: true, txHash, ncDeducted: ncCost, usdtAmount: amount, rate: usdToNgn, requestId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error("[miniapp-usdt-charge]", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
