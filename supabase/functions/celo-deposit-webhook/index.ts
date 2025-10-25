import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        // For CELO, you'd need to get CELO/USD price from an API
        // For now, using a placeholder conversion
        const celoUsdPrice = 0.50; // TODO: Get real-time CELO price
        nairaAmount = cryptoAmount * celoUsdPrice * usdToNgn;
      }

      const ncAmount = Math.floor(nairaAmount); // 1 NC = 1 Naira

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
        // Create unmatched transaction record
        await supabase.from("crypto_transactions").insert({
          user_id: "00000000-0000-0000-0000-000000000000", // Placeholder
          transaction_type: "deposit",
          crypto_amount: cryptoAmount,
          crypto_currency: asset,
          naira_amount: nairaAmount,
          nc_amount: ncAmount,
          exchange_rate: usdToNgn,
          wallet_address: toAddress,
          tx_hash: txHash,
          status: "failed",
          error_message: "No user found with this wallet address"
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

      // AUTO-SWEEP: Transfer funds from user wallet to master wallet
      console.log(`[SWEEP] Starting auto-sweep of ${cryptoAmount} ${asset} to master wallet`);
      
      try {
        // Get user's encrypted wallet from database
        const { data: userWalletData, error: walletError } = await supabase
          .from("profiles")
          .select("encrypted_wallet")
          .eq("user_id", profile.user_id)
          .single();

        if (walletError || !userWalletData?.encrypted_wallet) {
          console.error("[SWEEP] ❌ No encrypted wallet found for user - cannot sweep");
        } else {
          // Decrypt private key
          const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
          
          const CryptoJS = await import("https://cdn.skypack.dev/crypto-js@4.1.1");
          const decryptedKey = CryptoJS.AES.decrypt(
            userWalletData.encrypted_wallet,
            encryptionSecret
          ).toString(CryptoJS.enc.Utf8);

          if (!decryptedKey) {
            console.error("[SWEEP] ❌ Failed to decrypt wallet key");
          } else {
            // Create wallet instance for user
            const provider = new ethers.JsonRpcProvider("https://forno.celo.org");
            const userWallet = new ethers.Wallet(decryptedKey, provider);

            const masterWalletAddress = Deno.env.get("CELO_MASTER_WALLET_ADDRESS");
            if (!masterWalletAddress) {
              console.error("[SWEEP] ❌ Master wallet address not configured");
            } else {
              console.log(`[SWEEP] Transferring from ${userWallet.address} to ${masterWalletAddress}`);

              if (asset === "cUSD") {
                // Transfer cUSD using ERC-20 contract
                const cUsdAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
                const cUsdContract = new ethers.Contract(
                  cUsdAddress,
                  ["function transfer(address to, uint256 amount) returns (bool)"],
                  userWallet
                );

                const amountInWei = ethers.parseEther(cryptoAmount.toString());
                const sweepTx = await cUsdContract.transfer(masterWalletAddress, amountInWei);
                await sweepTx.wait();
                
                console.log(`[SWEEP] ✅ Successfully swept ${cryptoAmount} cUSD to master wallet`);
                console.log(`[SWEEP] Tx hash: ${sweepTx.hash}`);
              } else if (asset === "CELO") {
                // Transfer native CELO
                const amountInWei = ethers.parseEther(cryptoAmount.toString());
                const sweepTx = await userWallet.sendTransaction({
                  to: masterWalletAddress,
                  value: amountInWei
                });
                await sweepTx.wait();
                
                console.log(`[SWEEP] ✅ Successfully swept ${cryptoAmount} CELO to master wallet`);
                console.log(`[SWEEP] Tx hash: ${sweepTx.hash}`);
              }

              // Update crypto_transaction with sweep info
              await supabase
                .from("crypto_transactions")
                .update({
                  error_message: `Funds auto-swept to master wallet`
                })
                .eq("tx_hash", txHash);
            }
          }
        }
      } catch (sweepError: any) {
        console.error("[SWEEP] ❌ Auto-sweep failed:", sweepError.message);
        // Don't fail the entire transaction, just log the error
        await supabase
          .from("crypto_transactions")
          .update({
            error_message: `Credited successfully but auto-sweep failed: ${sweepError.message}`
          })
          .eq("tx_hash", txHash);
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
