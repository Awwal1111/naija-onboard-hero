import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import { sendAllNotifications } from '../_shared/notification-helper.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token contract addresses on Celo Mainnet
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, wallet_address } = await req.json();
    
    if (!user_id || !wallet_address) {
      return new Response(JSON.stringify({ 
        error: "Missing user_id or wallet_address" 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    console.log(`[CHECK-DEPOSIT] Checking deposits for user: ${user_id}`);
    console.log(`[CHECK-DEPOSIT] Wallet: ${wallet_address}`);

    const provider = new ethers.JsonRpcProvider("https://forno.celo.org");
    
    // Check balances for cUSD and USDT
    const cusdContract = new ethers.Contract(
      CUSD_ADDRESS,
      ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
      provider
    );
    
    const usdtContract = new ethers.Contract(
      USDT_ADDRESS,
      ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
      provider
    );

    const [cusdBalance, cusdDecimals, usdtBalance, usdtDecimals, celoBalance] = await Promise.all([
      cusdContract.balanceOf(wallet_address),
      cusdContract.decimals(),
      usdtContract.balanceOf(wallet_address),
      usdtContract.decimals(),
      provider.getBalance(wallet_address)
    ]);

    const cusdAmount = parseFloat(ethers.formatUnits(cusdBalance, cusdDecimals));
    const usdtAmount = parseFloat(ethers.formatUnits(usdtBalance, usdtDecimals));
    const celoAmount = parseFloat(ethers.formatEther(celoBalance));

    console.log(`[CHECK-DEPOSIT] Balances - cUSD: ${cusdAmount}, USDT: ${usdtAmount}, CELO: ${celoAmount}`);

    // Check for pending deposits that haven't been processed yet
    const { data: pendingTx } = await supabase
      .from('quidax_transactions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Minimum threshold to consider as a deposit (to avoid dust)
    const MIN_DEPOSIT = 0.01;
    
    let depositDetected = false;
    let asset = "";
    let cryptoAmount = 0;

    // Check if there's a pending Quidax transaction
    if (pendingTx) {
      console.log(`[CHECK-DEPOSIT] Found pending Quidax tx: ${pendingTx.reference}`);
      
      // For buy/on-ramp, check if USDT arrived
      if (pendingTx.transaction_type === 'buy' && usdtAmount >= MIN_DEPOSIT) {
        depositDetected = true;
        asset = "USDT";
        cryptoAmount = usdtAmount;
        console.log(`[CHECK-DEPOSIT] ✅ USDT deposit detected: ${cryptoAmount}`);
      }
    } else {
      // No pending Quidax tx - check for direct deposits
      if (usdtAmount >= MIN_DEPOSIT) {
        depositDetected = true;
        asset = "USDT";
        cryptoAmount = usdtAmount;
      } else if (cusdAmount >= MIN_DEPOSIT) {
        depositDetected = true;
        asset = "cUSD";
        cryptoAmount = cusdAmount;
      } else if (celoAmount >= 0.1) { // Higher threshold for CELO
        depositDetected = true;
        asset = "CELO";
        cryptoAmount = celoAmount;
      }
    }

    if (!depositDetected) {
      console.log(`[CHECK-DEPOSIT] No new deposits detected`);
      return new Response(JSON.stringify({ 
        success: true, 
        deposit_detected: false,
        balances: { cusd: cusdAmount, usdt: usdtAmount, celo: celoAmount }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if we already processed this amount recently (within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTx } = await supabase
      .from('crypto_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('crypto_currency', asset)
      .eq('status', 'completed')
      .gte('created_at', oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (recentTx) {
      console.log(`[CHECK-DEPOSIT] Recently processed similar deposit - skipping`);
      return new Response(JSON.stringify({ 
        success: true, 
        deposit_detected: false,
        message: "Recent deposit already processed"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[CHECK-DEPOSIT] Processing deposit: ${cryptoAmount} ${asset}`);

    // Get exchange rate
    let usdToNgn = 1600;
    try {
      const rateResponse = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(5000) });
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        if (rateData.conversion_rates?.NGN) {
          usdToNgn = rateData.conversion_rates.NGN;
        }
      }
    } catch (e) {
      console.log(`[CHECK-DEPOSIT] Using fallback exchange rate`);
    }

    // Calculate NC amount
    let nairaAmount = 0;
    if (asset === "cUSD" || asset === "USDT") {
      nairaAmount = cryptoAmount * usdToNgn;
    } else if (asset === "CELO") {
      // Get CELO price
      let celoPrice = 0.65;
      try {
        const celoResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd",
          { signal: AbortSignal.timeout(5000) }
        );
        if (celoResponse.ok) {
          const celoData = await celoResponse.json();
          if (celoData.celo?.usd) celoPrice = celoData.celo.usd;
        }
      } catch (e) { /* use fallback */ }
      nairaAmount = cryptoAmount * celoPrice * usdToNgn;
    }

    const ncAmount = Math.round(nairaAmount * 100) / 100;
    console.log(`[CHECK-DEPOSIT] NC to credit: ${ncAmount}`);

    // Generate a unique reference for this deposit
    const depositRef = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    await supabase.from("crypto_transactions").insert({
      user_id,
      transaction_type: "deposit",
      crypto_amount: cryptoAmount,
      crypto_currency: asset,
      naira_amount: nairaAmount,
      nc_amount: ncAmount,
      exchange_rate: usdToNgn,
      wallet_address,
      tx_hash: depositRef,
      status: "completed",
      completed_at: new Date().toISOString()
    });

    // Update user wallet
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance, balance_withdrawable")
      .eq("user_id", user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          wallet_balance: profile.wallet_balance + ncAmount,
          balance_withdrawable: profile.balance_withdrawable + ncAmount
        })
        .eq("user_id", user_id);
    }

    // Log wallet transaction
    await supabase.from("wallet_transactions").insert({
      user_id,
      kind: pendingTx ? "quidax_deposit" : "deposit",
      amount: ncAmount,
      status: "completed",
      reference: `Crypto deposit: ${cryptoAmount} ${asset}`
    });

    // Update Quidax transaction if exists
    if (pendingTx) {
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          token_amount: cryptoAmount,
          tx_hash: depositRef
        })
        .eq('id', pendingTx.id);
    }

    console.log(`[CHECK-DEPOSIT] ✅ Credited ${ncAmount} NC to user`);

    // ===== SWEEP FUNDS TO MASTER WALLET =====
    try {
      const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret";
      
      const { data: userWalletData } = await supabase
        .from("profiles")
        .select("encrypted_wallet")
        .eq("user_id", user_id)
        .single();

      const { data: masterAddressData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "master_wallet_address")
        .single();

      const { data: masterKeyData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "master_wallet_encrypted")
        .single();

      if (userWalletData?.encrypted_wallet && masterAddressData && masterKeyData) {
        const userPrivateKey = CryptoJS.AES.decrypt(userWalletData.encrypted_wallet, encryptionSecret).toString(CryptoJS.enc.Utf8);
        const masterPrivateKey = CryptoJS.AES.decrypt(masterKeyData.value, encryptionSecret).toString(CryptoJS.enc.Utf8);
        const masterAddress = masterAddressData.value;

        if (userPrivateKey && masterPrivateKey) {
          const userWallet = new ethers.Wallet(userPrivateKey, provider);
          const masterWallet = new ethers.Wallet(masterPrivateKey, provider);

          // Send gas from master to user
          const gasAmount = ethers.parseEther("0.003");
          const masterCeloBalance = await provider.getBalance(masterAddress);
          
          if (masterCeloBalance >= gasAmount) {
            console.log(`[SWEEP] Sending gas to user wallet...`);
            const gasTx = await masterWallet.sendTransaction({
              to: wallet_address,
              value: gasAmount
            });
            await gasTx.wait();
            console.log(`[SWEEP] Gas sent`);

            // Wait for gas to settle
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Sweep the deposited tokens
            if (asset === "USDT" || asset === "cUSD") {
              const tokenAddress = asset === "USDT" ? USDT_ADDRESS : CUSD_ADDRESS;
              const tokenContract = new ethers.Contract(
                tokenAddress,
                ["function transfer(address to, uint256 amount) returns (bool)", "function balanceOf(address) view returns (uint256)"],
                userWallet
              );

              const balance = await tokenContract.balanceOf(wallet_address);
              if (balance > 0) {
                const sweepTx = await tokenContract.transfer(masterAddress, balance);
                await sweepTx.wait();
                console.log(`[SWEEP] ✅ ${asset} swept to master wallet`);
              }
            }
          } else {
            console.log(`[SWEEP] ⚠️ Insufficient CELO in master for gas - funds remain in user wallet`);
          }
        }
      }
    } catch (sweepError: any) {
      console.error(`[SWEEP] Error: ${sweepError.message} - funds safe in user wallet`);
    }

    // Send notifications
    await sendAllNotifications(supabase, {
      userId: user_id,
      type: 'deposit_completed',
      title: '💰 Deposit Successful',
      message: `Your account has been credited with ₦${ncAmount.toLocaleString()} NC (${cryptoAmount} ${asset})`,
      amount: ncAmount,
      metadata: {
        reference: depositRef,
        cryptoAmount,
        asset,
        transactionType: 'Crypto Deposit'
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      deposit_detected: true,
      credited: ncAmount,
      asset,
      crypto_amount: cryptoAmount
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[CHECK-DEPOSIT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
