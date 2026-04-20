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

/**
 * CHECK-CELO-DEPOSITS - SINGLE SOURCE OF TRUTH FOR NC CREDITING
 * 
 * This function is called periodically by the frontend to check for new deposits.
 * It is the ONLY function that credits NC to users to prevent double-crediting.
 * 
 * CRITICAL: Uses a processing lock to prevent concurrent credits for the same deposit.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, wallet_address } = await req.json();
    
    if (!user_id || !wallet_address) {
      console.log("[CHECK-DEPOSIT] ❌ Missing user_id or wallet_address");
      return new Response(JSON.stringify({ 
        error: "Missing user_id or wallet_address" 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    console.log(`[CHECK-DEPOSIT] ========================================`);
    console.log(`[CHECK-DEPOSIT] 🔍 Checking deposits for user: ${user_id}`);
    console.log(`[CHECK-DEPOSIT] 📍 Wallet: ${wallet_address}`);

    // ===== CRITICAL: Check processing lock to prevent double-credit =====
    const lockKey = `deposit_processing_${user_id}`;
    const { data: existingLock } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', lockKey)
      .maybeSingle();

    if (existingLock) {
      const lockTime = parseInt(existingLock.value);
      const now = Date.now();
      // Lock expires after 60 seconds
      if (now - lockTime < 60000) {
        console.log(`[CHECK-DEPOSIT] ⏳ Deposit processing already in progress, skipping`);
        return new Response(JSON.stringify({ 
          success: true, 
          deposit_detected: false,
          message: "Processing already in progress"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

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

    let cusdAmount = 0, usdtAmount = 0, celoAmount = 0;
    
    try {
      const [cusdBalance, cusdDecimals, usdtBalance, usdtDecimals, celoBalance] = await Promise.all([
        cusdContract.balanceOf(wallet_address),
        cusdContract.decimals(),
        usdtContract.balanceOf(wallet_address),
        usdtContract.decimals(),
        provider.getBalance(wallet_address)
      ]);

      cusdAmount = parseFloat(ethers.formatUnits(cusdBalance, cusdDecimals));
      usdtAmount = parseFloat(ethers.formatUnits(usdtBalance, usdtDecimals));
      celoAmount = parseFloat(ethers.formatEther(celoBalance));

      console.log(`[CHECK-DEPOSIT] 💰 Current balances - cUSD: ${cusdAmount}, USDT: ${usdtAmount}, CELO: ${celoAmount}`);
    } catch (balanceError: any) {
      console.error(`[CHECK-DEPOSIT] ❌ Error fetching balances:`, balanceError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to fetch wallet balances",
        details: balanceError.message
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user's last recorded balance to detect new deposits
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('last_celo_balance, last_cusd_balance, last_usdt_balance, wallet_balance, balance_withdrawable')
      .eq('user_id', user_id)
      .single();

    const lastCusd = userProfile?.last_cusd_balance || 0;
    const lastUsdt = userProfile?.last_usdt_balance || 0;
    const lastCelo = userProfile?.last_celo_balance || 0;

    console.log(`[CHECK-DEPOSIT] 📊 Last recorded - cUSD: ${lastCusd}, USDT: ${lastUsdt}, CELO: ${lastCelo}`);

    // Minimum threshold for deposit detection
    const MIN_DEPOSIT = 0.01;
    
    // Calculate new deposits (current balance - last recorded balance)
    const newCusd = cusdAmount - lastCusd;
    const newUsdt = usdtAmount - lastUsdt;
    const newCelo = celoAmount - lastCelo;

    console.log(`[CHECK-DEPOSIT] 📈 Difference - cUSD: ${newCusd.toFixed(6)}, USDT: ${newUsdt.toFixed(6)}, CELO: ${newCelo.toFixed(6)}`);

    let depositDetected = false;
    let asset = "";
    let cryptoAmount = 0;

    // Prioritize USDT, then cUSD, then CELO
    if (newUsdt >= MIN_DEPOSIT) {
      depositDetected = true;
      asset = "USDT";
      cryptoAmount = newUsdt;
      console.log(`[CHECK-DEPOSIT] ✅ USDT deposit detected: ${cryptoAmount}`);
    } else if (newCusd >= MIN_DEPOSIT) {
      depositDetected = true;
      asset = "cUSD";
      cryptoAmount = newCusd;
      console.log(`[CHECK-DEPOSIT] ✅ cUSD deposit detected: ${cryptoAmount}`);
    } else if (newCelo >= 0.1) { // Higher threshold for CELO
      depositDetected = true;
      asset = "CELO";
      cryptoAmount = newCelo;
      console.log(`[CHECK-DEPOSIT] ✅ CELO deposit detected: ${cryptoAmount}`);
    }

    if (!depositDetected) {
      console.log(`[CHECK-DEPOSIT] ℹ️ No new deposits detected above threshold`);
      // Still update recorded balances to stay in sync
      await supabase
        .from('profiles')
        .update({
          last_cusd_balance: cusdAmount,
          last_usdt_balance: usdtAmount,
          last_celo_balance: celoAmount
        })
        .eq('user_id', user_id);
        
      return new Response(JSON.stringify({ 
        success: true, 
        deposit_detected: false,
        balances: { cusd: cusdAmount, usdt: usdtAmount, celo: celoAmount }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== CRITICAL: Set processing lock BEFORE crediting =====
    await supabase
      .from('system_settings')
      .upsert({
        key: lockKey,
        value: Date.now().toString()
      });

    console.log(`[CHECK-DEPOSIT] 🔒 Processing lock acquired`);
    console.log(`[CHECK-DEPOSIT] 🎉 Processing deposit: ${cryptoAmount} ${asset}`);

    // Generate a unique reference for this deposit based on amount and timestamp
    const depositRef = `DEP-${asset}-${cryptoAmount.toFixed(4)}-${Date.now()}`;

    // ===== CRITICAL: Check if we already credited this exact deposit =====
    const { data: existingTx } = await supabase
      .from("crypto_transactions")
      .select("id, status, nc_amount")
      .eq("user_id", user_id)
      .eq("crypto_currency", asset)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTx) {
      // Check if the amount is similar (within 1% tolerance)
      const existingAmount = existingTx.nc_amount || 0;
      console.log(`[CHECK-DEPOSIT] ⚠️ Found recent completed transaction: ${existingAmount} NC`);
      
      // Update balances and release lock
      await supabase
        .from('profiles')
        .update({
          last_cusd_balance: cusdAmount,
          last_usdt_balance: usdtAmount,
          last_celo_balance: celoAmount
        })
        .eq('user_id', user_id);

      await supabase.from('system_settings').delete().eq('key', lockKey);
      
      console.log(`[CHECK-DEPOSIT] ⏭️ Skipping - deposit was already credited recently`);
      return new Response(JSON.stringify({ 
        success: true, 
        deposit_detected: false,
        message: "Deposit already processed"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get exchange rate
    let usdToNgn = 1600;
    try {
      const rateResponse = await fetch(EXCHANGE_RATE_API, { signal: AbortSignal.timeout(5000) });
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        if (rateData.conversion_rates?.NGN) {
          usdToNgn = rateData.conversion_rates.NGN;
          console.log(`[CHECK-DEPOSIT] 💱 Exchange rate: 1 USD = ${usdToNgn} NGN`);
        }
      }
    } catch (e) {
      console.log(`[CHECK-DEPOSIT] ⚠️ Using fallback exchange rate`);
    }

    // Calculate NC amount
    let nairaAmount = 0;
    if (asset === "cUSD" || asset === "USDT") {
      nairaAmount = cryptoAmount * usdToNgn;
    } else if (asset === "CELO") {
      let celoPrice = 0.65;
      try {
        const celoResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd",
          { signal: AbortSignal.timeout(5000) }
        );
        if (celoResponse.ok) {
          const celoData = await celoResponse.json();
          if (celoData.celo?.usd) {
            celoPrice = celoData.celo.usd;
          }
        }
      } catch (e) { /* use fallback */ }
      nairaAmount = cryptoAmount * celoPrice * usdToNgn;
    }

    const ncAmount = Math.round(nairaAmount * 100) / 100;
    console.log(`[CHECK-DEPOSIT] 💵 NC to credit: ${ncAmount} (from ${nairaAmount.toFixed(2)} NGN)`);

    // Check if there's a "detected" transaction from webhook to update
    // Match same asset + recent (last 30 min) to avoid hijacking unrelated stale records
    const { data: existingDetected } = await supabase
      .from("crypto_transactions")
      .select("id, tx_hash")
      .eq("user_id", user_id)
      .eq("status", "detected")
      .eq("crypto_currency", asset)
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDetected) {
      console.log(`[CHECK-DEPOSIT] 📝 Updating existing detected transaction: ${existingDetected.id}`);
      await supabase
        .from("crypto_transactions")
        .update({
          naira_amount: nairaAmount,
          nc_amount: ncAmount,
          exchange_rate: usdToNgn,
          status: "completed",
          completed_at: new Date().toISOString(),
          error_message: null
        })
        .eq("id", existingDetected.id);
    } else {
      // Create new transaction record
      const { error: txInsertError } = await supabase.from("crypto_transactions").insert({
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

      if (txInsertError) {
        console.error(`[CHECK-DEPOSIT] ❌ Failed to create transaction:`, txInsertError);
      } else {
        console.log(`[CHECK-DEPOSIT] ✅ Transaction recorded: ${depositRef}`);
      }
    }

    // ===== CREDIT USER WALLET =====
    const currentBalance = userProfile?.wallet_balance || 0;
    const currentWithdrawable = userProfile?.balance_withdrawable || 0;
    const newBalance = currentBalance + ncAmount;
    const newWithdrawable = currentWithdrawable + ncAmount;
    
    await supabase
      .from("profiles")
      .update({
        wallet_balance: newBalance,
        balance_withdrawable: newWithdrawable,
        last_cusd_balance: cusdAmount,
        last_usdt_balance: usdtAmount,
        last_celo_balance: celoAmount
      })
      .eq("user_id", user_id);
    
    console.log(`[CHECK-DEPOSIT] 💰 Credited ${ncAmount} NC | Balance: ${currentBalance} → ${newBalance}`);

    // Log wallet transaction
    await supabase.from("wallet_transactions").insert({
      user_id,
      kind: "deposit",
      amount: ncAmount,
      status: "completed",
      reference: `Crypto deposit: ${cryptoAmount.toFixed(4)} ${asset}`
    });

    // Update any pending Quidax transaction
    const { data: pendingQuidax } = await supabase
      .from('quidax_transactions')
      .select('id, reference')
      .eq('user_id', user_id)
      .in('status', ['pending', 'crypto_received'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingQuidax) {
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'completed',
          token_amount: cryptoAmount
        })
        .eq('id', pendingQuidax.id);
      console.log(`[CHECK-DEPOSIT] ✅ Updated Quidax transaction: ${pendingQuidax.reference}`);
    }

    // ===== SWEEP FUNDS TO MASTER WALLET =====
    try {
      const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret";
      
      // Get encrypted_wallet from user_secrets (migrated from profiles)
      const { data: userWalletData } = await supabase
        .from("user_secrets")
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
            console.log(`[SWEEP] 🚀 Sending gas to user wallet...`);
            const gasTx = await masterWallet.sendTransaction({
              to: wallet_address,
              value: gasAmount
            });
            await gasTx.wait();
            console.log(`[SWEEP] ✅ Gas sent`);

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
            console.log(`[SWEEP] ⚠️ Insufficient CELO in master for gas`);
          }
        }
      }
    } catch (sweepError: any) {
      console.error(`[SWEEP] ❌ Error: ${sweepError.message}`);
    }

    // Release processing lock
    await supabase.from('system_settings').delete().eq('key', lockKey);
    console.log(`[CHECK-DEPOSIT] 🔓 Processing lock released`);

    // Send notifications
    try {
      await sendAllNotifications(supabase, {
        userId: user_id,
        type: 'deposit_completed',
        title: '💰 Deposit Successful',
        message: `Your account has been credited with ₦${ncAmount.toLocaleString()} NC (${cryptoAmount.toFixed(4)} ${asset})`,
        amount: ncAmount,
        metadata: {
          reference: depositRef,
          cryptoAmount,
          asset,
          transactionType: 'Crypto Deposit'
        }
      });
    } catch (notifError) {
      console.error(`[CHECK-DEPOSIT] ⚠️ Notification error:`, notifError);
    }

    console.log(`[CHECK-DEPOSIT] ========================================`);

    return new Response(JSON.stringify({ 
      success: true, 
      deposit_detected: true,
      credited: ncAmount,
      asset,
      crypto_amount: cryptoAmount
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[CHECK-DEPOSIT] ❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
