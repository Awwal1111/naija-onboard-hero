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
      const rawAsset = activity.asset;
      
      // For ERC20 tokens (like cUSD), Alchemy sends raw value with decimals
      // For native tokens (like CELO), it's already formatted
      let cryptoAmount = activity.value;
      
      // Check if this is an ERC20 token transfer
      if (activity.rawContract && activity.rawContract.decimal) {
        const decimals = parseInt(activity.rawContract.decimal);
        // Convert raw value to human-readable format
        cryptoAmount = parseFloat(ethers.formatUnits(activity.value.toString(), decimals));
        console.log(`[ERC20] Raw value: ${activity.value}, Decimals: ${decimals}, Formatted: ${cryptoAmount}`);
      } else {
        console.log(`[NATIVE] Value already formatted: ${cryptoAmount}`);
      }
      
      // Normalize asset names to match database constraints
      let asset = rawAsset;
      const contractAddress = activity.rawContract?.address?.toLowerCase();
      
      // Identify token by contract address for accuracy
      if (contractAddress === "0x765de816845861e75a25fca122bb6898b8b1282a") {
        asset = "cUSD"; // cUSD token
      } else if (contractAddress === "0x88eec49252c8cbc039dcdb394c0c2ba2f1637ea0") {
        asset = "USDT"; // USDT on Celo Mainnet
      } else if (rawAsset === "ETH") {
        asset = "CELO"; // Native CELO (mapped as ETH by Alchemy)
      } else if (rawAsset === "USD₮" || rawAsset === "USDC") {
        // Fallback for other USD stablecoins
        asset = contractAddress === "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" ? "USDT" : "cUSD";
      }
      
      console.log(`[CURRENCY] Raw asset: ${rawAsset}, Normalized to: ${asset}, Amount: ${cryptoAmount}`);

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

      // Calculate Naira amount (assuming 1 cUSD = 1 USD, 1 USDT = 1 USD, 1 CELO = current market price)
      let nairaAmount = 0;
      if (asset === "cUSD" || asset === "USDT") {
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
        console.log(`[MASTER_WALLET] 🎯 MASTER WALLET DEPOSIT DETECTED!`);
        console.log(`[MASTER_WALLET] 💰 Amount: ${cryptoAmount} ${asset}`);
        console.log(`[MASTER_WALLET] 📍 To: ${toAddress}`);
        console.log(`[MASTER_WALLET] 🔗 Tx: ${txHash}`);
        console.log(`[MASTER_WALLET] ✅ This is system funding - no user credit, no sweep`);
        
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
          completed_at: new Date().toISOString(),
          error_message: `✅ Master wallet funded with ${cryptoAmount} ${asset}. System ready for withdrawals.`
        });
        
        console.log(`[MASTER_WALLET] 📝 Transaction logged. Master wallet now has more ${asset}.`);
        continue; // Skip user credit and sweep logic for master wallet
      }

      // Find user by their wallet address (the recipient of the deposit)
      console.log(`[LOOKUP] 🔍 Searching for user with wallet: ${toAddress}`);
      console.log(`[LOOKUP] 💰 Deposit: ${cryptoAmount} ${asset}`);
      console.log(`[LOOKUP] 🔗 Tx Hash: ${txHash}`);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, telegram_user_id, celo_wallet_address")
        .ilike("celo_wallet_address", toAddress)
        .maybeSingle();

      console.log(`[LOOKUP] 📋 Profile found:`, profile ? `✅ Yes (user: ${profile.user_id}, name: ${profile.full_name})` : '❌ No');
      if (profileError) {
        console.error(`[LOOKUP] ⚠️ Database Error:`, profileError);
      }

      if (!profile) {
        console.log(`[ERROR] ❌ DEPOSIT FAILED - No user found with wallet: ${toAddress}`);
        console.log(`[ERROR] 📍 This ${asset} deposit cannot be credited - wallet not in database`);
        console.log(`[ERROR] 💡 User needs to generate their wallet in the app first`);
        console.log(`[INFO] 💡 Master wallet address: ${masterWalletAddress}`);
        console.log(`[INFO] 📝 If this was meant for master wallet, it's already there`);
        
        // Create unmatched transaction record with clear error
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
          error_message: `❌ UNMATCHED DEPOSIT: ${cryptoAmount} ${asset} sent to ${toAddress} but no user found with this wallet address. User must generate wallet in app first. If funding master wallet, send to: ${masterWalletAddress}`
        });
        continue;
      }
      
      console.log(`[CREDIT] ✅ User identified: ${profile.full_name} (${profile.user_id})`);
      console.log(`[CREDIT] 💵 Will credit: ${ncAmount} NC for ${cryptoAmount} ${asset}`);

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

        // STEP 1: Master sends gas to user wallet
        // For cUSD/USDT, send 0.003 CELO (more for ERC20 transfers)
        // For CELO, send 0.002 CELO (less needed for native transfers)
        const gasAmount = (asset === "cUSD" || asset === "USDT") 
          ? ethers.parseEther("0.003") 
          : ethers.parseEther("0.002");
        
        console.log(`[RELAYER] Step 1: Master wallet sending ${ethers.formatEther(gasAmount)} CELO for gas...`);
        
        // Check master wallet CELO balance first
        const masterCeloBalance = await provider.getBalance(masterAddress);
        console.log(`[RELAYER] Master CELO balance: ${ethers.formatEther(masterCeloBalance)}`);
        
        if (masterCeloBalance < gasAmount) {
          console.log(`[RELAYER] ❌ Insufficient CELO in master wallet for gas`);
          console.log(`[RELAYER] Has: ${ethers.formatEther(masterCeloBalance)}, Needs: ${ethers.formatEther(gasAmount)}`);
          await supabase.from("crypto_transactions").update({
            error_message: `Insufficient CELO in master wallet for gas. Has: ${ethers.formatEther(masterCeloBalance)}, Needs: ${ethers.formatEther(gasAmount)}. Please fund master wallet with CELO.`
          }).eq("tx_hash", txHash);
          continue;
        }
        
        const gasTx = await masterWallet.sendTransaction({
          to: toAddress,
          value: gasAmount
        });
        const gasReceipt = await gasTx.wait();
        console.log(`[RELAYER] ✅ Gas sent: ${gasReceipt!.hash}`);

        // STEP 2: User wallet sweeps funds to master
        console.log("[RELAYER] Step 2: Sweeping funds to master...");
        let sweepTxHash = "";

        if (asset === "cUSD" || asset === "USDT") {
          const tokenAddress = asset === "cUSD" 
            ? "0x765DE816845861e75A25fCA122bb6898B8B1282a" 
            : "0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0"; // USDT on Celo Mainnet
          
          console.log(`[RELAYER] Token contract: ${tokenAddress}`);
          console.log(`[RELAYER] Master wallet destination: ${masterAddress}`);
          
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              "function transfer(address to, uint256 amount) returns (bool)",
              "function balanceOf(address account) view returns (uint256)",
              "function decimals() view returns (uint8)"
            ],
            userWallet
          );
          
          // Get token decimals
          const decimals = await tokenContract.decimals();
          console.log(`[RELAYER] ${asset} decimals: ${decimals}`);
          
          // Wait 10 seconds for deposit to fully settle on-chain
          console.log(`[RELAYER] Waiting 10 seconds for on-chain settlement...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Check user wallet balance BEFORE attempting sweep with retries
          let userBalance = BigInt(0);
          let retries = 3;
          
          for (let i = 0; i < retries; i++) {
            userBalance = await tokenContract.balanceOf(toAddress);
            const userBalanceFormatted = ethers.formatUnits(userBalance, decimals);
            console.log(`[RELAYER] Attempt ${i + 1}/${retries} - User wallet ${asset} balance: ${userBalanceFormatted}`);
            
            const amountInWei = ethers.parseUnits(cryptoAmount.toFixed(decimals), decimals);
            
            // Check if balance is sufficient (with 1% tolerance for rounding)
            if (userBalance >= (amountInWei * BigInt(99) / BigInt(100))) {
              console.log(`[RELAYER] ✅ Balance confirmed: ${userBalanceFormatted} ${asset}`);
              break;
            }
            
            if (i < retries - 1) {
              console.log(`[RELAYER] Balance not yet settled, waiting 5 more seconds...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
          
          const userBalanceFormatted = ethers.formatUnits(userBalance, decimals);
          console.log(`[RELAYER] Final check - User wallet ${asset} balance: ${userBalanceFormatted}`);
          console.log(`[RELAYER] Expected deposit amount: ${cryptoAmount}`);
          
          const amountInWei = ethers.parseUnits(cryptoAmount.toFixed(decimals), decimals);
          
          // Only sweep if user has enough balance (with 1% tolerance for rounding)
          if (userBalance < (amountInWei * BigInt(99) / BigInt(100))) {
            console.log(`[RELAYER] ⚠️ Insufficient user balance to sweep after ${retries} attempts.`);
            console.log(`[RELAYER] Has: ${userBalanceFormatted} ${asset}, Needs: ${cryptoAmount} ${asset}`);
            console.log(`[RELAYER] Skipping sweep - funds safe in user wallet.`);
            sweepTxHash = "insufficient_balance_skipped";
          } else {
            // Sweep the actual balance (might be slightly less due to gas estimation)
            const sweepAmount = userBalance > amountInWei ? amountInWei : userBalance;
            console.log(`[RELAYER] Attempting to sweep ${ethers.formatUnits(sweepAmount, decimals)} ${asset}...`);
            
            const sweepTx = await tokenContract.transfer(masterAddress, sweepAmount);
            const sweepReceipt = await sweepTx.wait();
            sweepTxHash = sweepReceipt.hash;
            console.log(`[RELAYER] ✅ ${asset} swept: ${sweepTxHash} (amount: ${ethers.formatUnits(sweepAmount, decimals)})`);
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
