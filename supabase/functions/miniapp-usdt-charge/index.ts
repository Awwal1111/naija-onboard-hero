// USDT Charge: deducts NC from the end user (PIN-validated) and sends the
// equivalent USDT from the platform master wallet to the developer's external
// address (provided per-call by the SDK). Developer wallet is NEVER stored on
// our side — they pass it in every charge call (MetaMask-SDK style).
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("No authorization");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { miniAppId, toAddress: rawTo, usdtAmount, pin } = await req.json();
    if (!miniAppId || !rawTo || !usdtAmount || !pin) throw new Error("Missing fields");
    if (!ethers.isAddress(rawTo)) throw new Error("Invalid destination address");
    const toAddress = ethers.getAddress(rawTo);
    const amount = Number(usdtAmount);
    if (!isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    if (amount < 0.5) throw new Error("Minimum charge is 0.5 USDT");

    // Verify PIN
    const { data: secrets } = await supabase.from("user_secrets")
      .select("transaction_pin").eq("user_id", user.id).maybeSingle();
    if (!secrets?.transaction_pin) throw new Error("Set up your transaction PIN first");
    if (String(secrets.transaction_pin) !== String(pin)) throw new Error("Incorrect PIN");

    // Get mini app
    const { data: app } = await supabase.from("mini_apps")
      .select("id, app_name").eq("id", miniAppId).single();
    if (!app) throw new Error("MiniApp not found");

    // Compute NC cost (USDT × current NGN rate, no platform fee)
    let usdToNgn = 1600;
    try {
      const r = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        if (j.conversion_rates?.NGN) usdToNgn = j.conversion_rates.NGN;
      }
    } catch { /* fallback */ }
    const ncCost = Math.ceil(amount * usdToNgn);

    // Check user NC balance (withdrawable)
    const { data: profile } = await supabase.from("profiles")
      .select("wallet_balance, balance_withdrawable").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile missing");
    if ((profile.balance_withdrawable || 0) < ncCost) {
      throw new Error(`Insufficient NC. Need ${ncCost} NC for ${amount} USDT.`);
    }

    // Deduct NC FIRST (refunded if on-chain fails)
    await supabase.from("profiles").update({
      wallet_balance: (profile.wallet_balance || 0) - ncCost,
      balance_withdrawable: (profile.balance_withdrawable || 0) - ncCost,
    }).eq("user_id", user.id);

    // Send USDT from master wallet → developer-supplied address
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
      // Refund NC
      await supabase.from("profiles").update({
        wallet_balance: (profile.wallet_balance || 0),
        balance_withdrawable: (profile.balance_withdrawable || 0),
      }).eq("user_id", user.id);
      throw new Error(`On-chain send failed: ${chainErr?.message || chainErr}. NC refunded.`);
    }

    // Log
    await supabase.from("crypto_transactions").insert({
      user_id: user.id,
      transaction_type: "miniapp_charge",
      crypto_amount: amount,
      crypto_currency: "USDT",
      naira_amount: ncCost,
      nc_amount: ncCost,
      exchange_rate: usdToNgn,
      wallet_address: toAddress.toLowerCase(),
      tx_hash: txHash,
      status: "confirmed",
    });

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      kind: "miniapp_charge",
      amount: -ncCost,
      status: "completed",
      reference: `MiniApp ${app.app_name}: ${amount} USDT to ${toAddress.slice(0, 8)}... (tx ${txHash.slice(0, 10)}...)`,
    });

    return new Response(JSON.stringify({ success: true, txHash, ncDeducted: ncCost, usdtAmount: amount, rate: usdToNgn }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error("[miniapp-usdt-charge]", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
