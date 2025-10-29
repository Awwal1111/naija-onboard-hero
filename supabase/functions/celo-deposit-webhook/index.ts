import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlchemyWebhookEvent {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    network: string;
    activity: Array<{
      fromAddress: string;
      toAddress: string;
      blockNum: string;
      hash: string;
      value: number;
      asset: string;
      category: string;
      rawContract: {
        address: string;
        decimal: string;
      };
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData: AlchemyWebhookEvent = await req.json();
    console.log("Received Alchemy webhook:", JSON.stringify(webhookData));

    const activities = webhookData.event?.activity || [];

    for (const activity of activities) {
      const txHash = activity.hash;
      const toAddress = activity.toAddress.toLowerCase(); // User's wallet receiving the deposit
      const cryptoAmount = activity.value;
      const rawAsset = activity.asset;
      
      // Normalize asset names to match database constraints
      let asset = rawAsset;
      if (rawAsset === "USD₮" || rawAsset === "USDT") {
        asset = "cUSD"; // Map USDT to cUSD for database compatibility
      } else if (rawAsset === "ETH") {
        asset = "CELO"; // Map ETH to CELO for Celo network
      }
      
      console.log(`[CURRENCY] Raw asset: ${rawAsset}, Normalized to: ${asset}`);

      console.log(`[DEPOSIT] Processing: ${cryptoAmount} ${asset} to ${toAddress}, tx: ${txHash}`);

      // Check if transaction already processed
      const { data: existing } = await supabase
        .from("crypto_transactions")
        .select("id")
        .eq("tx_hash", txHash)
        .single();

      if (existing) {
        console.log("Transaction already processed:", txHash);
        continue;
      }

      // Get exchange rate (USD to NGN)
      const rateResponse = await fetch(EXCHANGE_RATE_API);
      const rateData = await rateResponse.json();
      const usdToNgn = rateData.conversion_rates?.NGN || 1600; // Fallback rate

      console.log("Exchange rate USD -> NGN:", usdToNgn);

      // Calculate Naira amount (assuming 1 cUSD = 1 USD, 1 CELO = current market price)
      let nairaAmount = 0;
      if (asset === "cUSD") {
        nairaAmount = cryptoAmount * usdToNgn;
      } else if (asset === "CELO") {
        // Fetch real-time CELO price
        try {
          const celoResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd");
          const celoData = await celoResponse.json();
          const celoUsdPrice = celoData.celo?.usd || 0.65; // Fallback to $0.65
          console.log(`[CELO_PRICE] Current CELO price: $${celoUsdPrice}`);
          nairaAmount = cryptoAmount * celoUsdPrice * usdToNgn;
        } catch (priceError) {
          console.error("[CELO_PRICE] Failed to fetch, using fallback $0.65");
          nairaAmount = cryptoAmount * 0.65 * usdToNgn;
        }
      }

      const ncAmount = Math.floor(nairaAmount); // 1 NC = 1 Naira

      // Check if this is master wallet deposit (admin funding the system)
      const { data: masterWalletSettings } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "master_wallet_address")
        .single();
      
      const masterWalletAddress = masterWalletSettings?.value?.toLowerCase();
      
      if (masterWalletAddress && toAddress === masterWalletAddress) {
        console.log(`[MASTER_WALLET] ✅ Deposit to master wallet detected: ${cryptoAmount} ${asset}`);
        console.log(`[MASTER_WALLET] This is admin funding the system - no user credit needed`);
        
        // Log master wallet funding transaction
        await supabase.from("crypto_transactions").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          transaction_type: "deposit",
          crypto_amount: cryptoAmount,
          crypto_currency: asset,
          naira_amount: nairaAmount,
          nc_amount: ncAmount,
          exchange_rate: usdToNgn,
          wallet_address: toAddress,
          tx_hash: txHash,
          status: "completed",
          error_message: "Master wallet funding - system balance increased"
        });
        
        continue; // Skip user credit logic for master wallet
      }

      // Find user by their wallet address (the recipient of the deposit)
      console.log(`[LOOKUP] Searching for user with wallet: ${toAddress}`);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, telegram_user_id, celo_wallet_address")
        .eq("celo_wallet_address", toAddress)
        .maybeSingle();

      console.log(`[LOOKUP] Profile found:`, profile ? `Yes (user: ${profile.user_id})` : 'No');
      if (profileError) {
        console.error(`[LOOKUP] Error:`, profileError);
      }

      if (!profile) {
        console.log(`[ERROR] No user found with wallet address: ${toAddress}`);
        console.log(`[ERROR] This address is not registered as a user wallet`);
        console.log(`[ERROR] If you want to fund the master wallet, send to: ${masterWalletAddress}`);
        
        // Create unmatched transaction record
        await supabase.from("crypto_transactions").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          transaction_type: "deposit",
          crypto_amount: cryptoAmount,
          crypto_currency: asset,
          naira_amount: nairaAmount,
          nc_amount: ncAmount,
          exchange_rate: usdToNgn,
          wallet_address: toAddress,
          tx_hash: txHash,
          status: "failed",
          error_message: `No user found with wallet ${toAddress}. To fund master wallet, send to: ${masterWalletAddress}`
        });
        continue;
      }

      // Create transaction record
      console.log(`[CREDIT] Creating transaction record for ${ncAmount} NC`);
      const { error: txError } = await supabase
        .from("crypto_transactions")
        .insert({
          user_id: profile.user_id,
          transaction_type: "deposit",
          crypto_amount: cryptoAmount,
          crypto_currency: asset,
          naira_amount: nairaAmount,
          nc_amount: ncAmount,
          exchange_rate: usdToNgn,
          wallet_address: toAddress,
          tx_hash: txHash,
          status: "completed",
          completed_at: new Date().toISOString()
        });

      if (txError) {
        console.error("[ERROR] Failed to create transaction record:", txError);
        continue;
      }

      // Get current balance
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("wallet_balance, balance_withdrawable")
        .eq("user_id", profile.user_id)
        .single();

      if (!currentProfile) {
        console.error("[ERROR] Could not fetch current balance");
        continue;
      }

      // Credit user wallet
      console.log(`[CREDIT] Current balance: ${currentProfile.wallet_balance}, Adding: ${ncAmount}`);
      const { error: walletError } = await supabase
        .from("profiles")
        .update({
          wallet_balance: currentProfile.wallet_balance + ncAmount,
          balance_withdrawable: currentProfile.balance_withdrawable + ncAmount
        })
        .eq("user_id", profile.user_id);

      if (walletError) {
        console.error("[ERROR] Failed to update wallet:", walletError);
        continue;
      }

      // Log wallet transaction
      const { error: wtError } = await supabase.from("wallet_transactions").insert({
        user_id: profile.user_id,
        kind: "deposit",
        amount: ncAmount,
        status: "completed",
        reference: `Crypto deposit: ${cryptoAmount} ${asset} (Tx: ${txHash})`
      });

      if (wtError) {
        console.error("[ERROR] Failed to log wallet transaction:", wtError);
      }

      console.log(`[SUCCESS] ✅ Credited ${ncAmount} NC to user ${profile.user_id}`);

      // ===== RELAYER SYSTEM: Master wallet pays gas for sweeps =====
      console.log(`[RELAYER] Starting relayer sweep for ${cryptoAmount} ${asset}`);
      console.log(`[RELAYER] User: ${profile.user_id}, Wallet: ${toAddress}`);
      
      try {
        // Get user's encrypted wallet
        const { data: userWalletData, error: walletError } = await supabase
          .from("profiles")
          .select("encrypted_wallet")
          .eq("user_id", profile.user_id)
          .single();

        if (walletError || !userWalletData?.encrypted_wallet) {
          console.log("[RELAYER] ❌ No encrypted wallet found - skipping sweep (funds safe in user wallet)");
          await supabase.from("crypto_transactions").update({
            error_message: "No encrypted wallet - sweep skipped, funds remain in user wallet"
          }).eq("tx_hash", txHash);
          continue;
        }

        // Decrypt both user and master wallet keys
        const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
        const userPrivateKey = CryptoJS.AES.decrypt(userWalletData.encrypted_wallet, encryptionSecret).toString(CryptoJS.enc.Utf8);

        if (!userPrivateKey) {
          console.log("[RELAYER] ❌ Failed to decrypt user wallet key");
          continue;
        }

        // Get master wallet info
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

        if (!masterAddressData || !masterKeyData) {
          console.log("[RELAYER] ❌ Master wallet not properly configured");
          continue;
        }

        const masterAddress = masterAddressData.value;
        const masterPrivateKey = CryptoJS.AES.decrypt(masterKeyData.value, encryptionSecret).toString(CryptoJS.enc.Utf8);

        console.log(`[RELAYER] Master wallet: ${masterAddress}`);
        console.log(`[RELAYER] User wallet: ${toAddress}`);

        // Connect wallets
        const provider = new ethers.JsonRpcProvider("https://forno.celo.org");
        const userWallet = new ethers.Wallet(userPrivateKey, provider);
        const masterWallet = new ethers.Wallet(masterPrivateKey, provider);

        // STEP 1: Master sends gas (0.002 CELO) to user wallet
        console.log("[RELAYER] Step 1: Master wallet sending gas...");
        const gasAmount = ethers.parseEther("0.002");
        const gasTx = await masterWallet.sendTransaction({
          to: toAddress,
          value: gasAmount
        });
        const gasReceipt = await gasTx.wait();
        console.log(`[RELAYER] ✅ Gas sent: ${gasReceipt!.hash}`);

        // STEP 2: User wallet sweeps funds to master
        console.log("[RELAYER] Step 2: Sweeping funds to master...");
        let sweepTxHash = "";

        if (asset === "cUSD") {
          const cUsdAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
          const cUsdContract = new ethers.Contract(
            cUsdAddress,
            [
              "function transfer(address to, uint256 amount) returns (bool)",
              "function balanceOf(address account) view returns (uint256)"
            ],
            userWallet
          );
          
          // Wait 2 seconds for deposit to fully settle on-chain
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check user wallet balance BEFORE attempting sweep
          const userBalance = await cUsdContract.balanceOf(toAddress);
          const userBalanceFormatted = ethers.formatEther(userBalance);
          console.log(`[RELAYER] User wallet cUSD balance: ${userBalanceFormatted}`);
          console.log(`[RELAYER] Expected deposit amount: ${cryptoAmount}`);
          
          const amountInWei = ethers.parseEther(cryptoAmount.toFixed(6));
          
          // Only sweep if user has enough balance (with 5% tolerance for rounding/gas)
          if (userBalance < (amountInWei * BigInt(95) / BigInt(100))) {
            console.log(`[RELAYER] ⚠️ Insufficient user balance to sweep. Has: ${userBalanceFormatted}, Needs: ${cryptoAmount}. Skipping sweep - funds safe in user wallet.`);
            console.log(`[RELAYER] This may happen if the deposit hasn't fully settled yet.`);
            sweepTxHash = "insufficient_balance_skipped";
          } else {
            // Sweep the actual balance (might be slightly less due to gas estimation)
            const sweepAmount = userBalance > amountInWei ? amountInWei : userBalance;
            console.log(`[RELAYER] Attempting to sweep ${ethers.formatEther(sweepAmount)} cUSD...`);
            
            const sweepTx = await cUsdContract.transfer(masterAddress, sweepAmount);
            const sweepReceipt = await sweepTx.wait();
            sweepTxHash = sweepReceipt.hash;
            console.log(`[RELAYER] ✅ cUSD swept: ${sweepTxHash} (amount: ${ethers.formatEther(sweepAmount)})`);
          }
        } else if (asset === "CELO") {
          // For CELO, keep 0.001 for future gas
          const userBalance = await provider.getBalance(toAddress);
          const keepAmount = ethers.parseEther("0.001");
          const sweepAmount = userBalance - keepAmount - ethers.parseEther("0.0001"); // Leave gas buffer

          if (sweepAmount > 0) {
            const sweepTx = await userWallet.sendTransaction({
              to: masterAddress,
              value: sweepAmount
            });
            const sweepReceipt = await sweepTx.wait();
            sweepTxHash = sweepReceipt!.hash;
            console.log(`[RELAYER] ✅ CELO swept: ${sweepTxHash} (kept ${ethers.formatEther(keepAmount)} for future)`);
          } else {
            console.log("[RELAYER] ⚠️ Insufficient CELO to sweep");
            sweepTxHash = "insufficient_balance";
          }
        }

        // Log complete sweep details
        console.log(`[RELAYER] ========== SWEEP COMPLETE ==========`);
        console.log(`[RELAYER] User ID: ${profile.user_id}`);
        console.log(`[RELAYER] Wallet: ${toAddress}`);
        console.log(`[RELAYER] Amount: ${cryptoAmount} ${asset}`);
        console.log(`[RELAYER] NC Credited: ${ncAmount}`);
        console.log(`[RELAYER] Gas TX: ${gasReceipt!.hash}`);
        console.log(`[RELAYER] Sweep TX: ${sweepTxHash}`);
        console.log(`[RELAYER] From: ${toAddress} → To: ${masterAddress}`);
        console.log(`[RELAYER] ====================================`);

        // Update transaction record
        await supabase.from("crypto_transactions").update({
          tx_hash: sweepTxHash,
          error_message: null
        }).eq("tx_hash", txHash);

      } catch (sweepError: any) {
        console.error(`[RELAYER] ❌ Sweep failed: ${sweepError.message}`);
        console.error(`[RELAYER] Stack: ${sweepError.stack}`);
        
        // Log failure but don't revert NC credit (funds are safe in user wallet)
        await supabase.from("crypto_transactions").update({
          error_message: `Sweep failed: ${sweepError.message}. Funds remain safe in user wallet.`
        }).eq("tx_hash", txHash);
      }

      // Send Telegram notification if user has linked account
      if (profile.telegram_user_id) {
        try {
          const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: profile.telegram_user_id,
                text: `✅ *Deposit Successful!*\n\n` +
                      `Amount: ${cryptoAmount} ${asset}\n` +
                      `Credited: ₦${ncAmount} NC\n` +
                      `Tx Hash: ${txHash}\n\n` +
                      `Thank you for using NaijaLancers! 🎉`,
                parse_mode: "Markdown"
              })
            });
          }
        } catch (notifError) {
          console.error("Error sending Telegram notification:", notifError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
