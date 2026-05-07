// Verifies an on-chain USDT (Celo) transfer from the user's wallet to the
// platform master wallet, then credits the developer's NC balance with the
// equivalent NC amount (1 USDT = current USD→NGN rate, no platform fee).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CELO_RPC = "https://forno.celo.org";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("No authorization");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { miniAppId, txHash, expectedUsdt } = await req.json();
    if (!miniAppId || !txHash || !expectedUsdt) throw new Error("Missing fields");
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Invalid txHash");

    // Idempotency check
    const { data: existing } = await supabase.from("crypto_transactions")
      .select("id").eq("tx_hash", txHash).limit(1).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get master wallet address
    const { data: mw } = await supabase.from("system_settings")
      .select("value").eq("key", "master_wallet_address").single();
    if (!mw?.value) throw new Error("Master wallet not configured");
    const masterAddr = String(mw.value).toLowerCase();

    // Get mini app + developer
    const { data: app } = await supabase.from("mini_apps")
      .select("id, developer_id, app_name").eq("id", miniAppId).single();
    if (!app) throw new Error("MiniApp not found");

    // Verify on-chain tx
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) throw new Error("Transaction not confirmed");

    // Find Transfer log to master wallet on USDT contract
    const transferLog = receipt.logs.find(l =>
      l.address.toLowerCase() === USDT_ADDRESS.toLowerCase() &&
      l.topics[0] === TRANSFER_TOPIC &&
      l.topics.length >= 3 &&
      ("0x" + l.topics[2].slice(26).toLowerCase()) === masterAddr
    );
    if (!transferLog) throw new Error("Transfer to master wallet not found");

    const fromAddr = "0x" + transferLog.topics[1].slice(26);
    const amountWei = BigInt(transferLog.data);
    const usdtAmount = Number(amountWei) / 1e6; // USDT has 6 decimals on Celo

    // Tolerance: at least the expected amount (allow tiny dust over)
    if (usdtAmount + 0.0001 < Number(expectedUsdt)) {
      throw new Error(`Underpaid: got ${usdtAmount}, expected ${expectedUsdt}`);
    }

    // Get USD → NGN rate
    let usdToNgn = 1600;
    try {
      const r = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        if (j.conversion_rates?.NGN) usdToNgn = j.conversion_rates.NGN;
      }
    } catch { /* fallback */ }

    const ncCredit = Math.round(usdtAmount * usdToNgn);

    // Credit developer NC (both wallet and withdrawable)
    const { data: devProfile } = await supabase.from("profiles")
      .select("wallet_balance, balance_withdrawable").eq("user_id", app.developer_id).single();
    if (!devProfile) throw new Error("Developer profile missing");

    await supabase.from("profiles").update({
      wallet_balance: (devProfile.wallet_balance || 0) + ncCredit,
      balance_withdrawable: (devProfile.balance_withdrawable || 0) + ncCredit,
    }).eq("user_id", app.developer_id);

    // Log records
    await supabase.from("crypto_transactions").insert({
      user_id: user.id,
      transaction_type: "miniapp_charge",
      crypto_amount: usdtAmount,
      crypto_currency: "USDT",
      naira_amount: ncCredit,
      nc_amount: ncCredit,
      exchange_rate: usdToNgn,
      wallet_address: fromAddr,
      tx_hash: txHash,
      status: "confirmed",
    });

    await supabase.from("wallet_transactions").insert({
      user_id: app.developer_id,
      kind: "miniapp_revenue",
      amount: ncCredit,
      status: "completed",
      reference: `MiniApp ${app.app_name}: ${usdtAmount} USDT (tx ${txHash.slice(0, 10)}...)`,
    });

    return new Response(JSON.stringify({ success: true, ncCredited: ncCredit, usdtAmount, rate: usdToNgn }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error("[miniapp-usdt-charge]", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
