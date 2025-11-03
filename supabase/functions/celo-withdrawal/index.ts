import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CELO_RPC = "https://forno.celo.org";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";
const MIN_WITHDRAWAL_NC = 100;

// Token addresses on Celo mainnet (checksummed)
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const USDT_ADDRESS = "0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0"; // USDT on Celo Mainnet

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to safely format BigInt values
function formatBigInt(value: bigint, decimals: number = 18): string {
  return (parseFloat(value.toString()) / Math.pow(10, decimals)).toFixed(decimals);
}

// Helper to safely convert number to string for parseUnits
function toAmountString(num: number, decimals: number): string {
  return num.toFixed(decimals);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { walletAddress: rawWalletAddress, ncAmount, currency } = await req.json();

    // Validate and checksum the address
    if (!rawWalletAddress || !ethers.isAddress(rawWalletAddress)) {
      throw new Error("Invalid wallet address");
    }
    
    // Convert to checksummed address to avoid checksum errors
    const walletAddress = ethers.getAddress(rawWalletAddress);

    if (!ncAmount || ncAmount < MIN_WITHDRAWAL_NC) {
      throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL_NC} NC`);
    }

    if (!["cUSD", "CELO", "USDT"].includes(currency)) {
      throw new Error("Currency must be cUSD, USDT, or CELO");
    }

    // Get user profile and check balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance, balance_withdrawable, full_name, telegram_user_id")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.balance_withdrawable < ncAmount) {
      throw new Error("Insufficient withdrawable balance");
    }

    // Get exchange rate
    const rateResponse = await fetch(EXCHANGE_RATE_API);
    const rateData = await rateResponse.json();
    const usdToNgn = rateData.conversion_rates?.NGN || 1600;

    // Calculate crypto amount to send
    const nairaAmount = ncAmount;
    let cryptoAmount = 0;

    if (currency === "cUSD" || currency === "USDT") {
      cryptoAmount = nairaAmount / usdToNgn; // Convert NGN to USD (cUSD/USDT)
    } else if (currency === "CELO") {
      // Fetch real-time CELO price
      try {
        const celoResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd");
        const celoData = await celoResponse.json();
        const celoUsdPrice = celoData.celo?.usd || 0.65; // Fallback to $0.65
        console.log(`[CELO_PRICE] Current CELO price: $${celoUsdPrice}`);
        cryptoAmount = (nairaAmount / usdToNgn) / celoUsdPrice;
      } catch (priceError) {
        console.error("[CELO_PRICE] Failed to fetch, using fallback");
        const celoUsdPrice = 0.65;
        cryptoAmount = (nairaAmount / usdToNgn) / celoUsdPrice;
      }
    }

    console.log(`Withdrawal: ${ncAmount} NC -> ${cryptoAmount} ${currency}`);

    // Create transaction record
    const { data: txRecord, error: txError } = await supabase
      .from("crypto_transactions")
      .insert({
        user_id: user.id,
        transaction_type: "withdrawal",
        crypto_amount: cryptoAmount,
        crypto_currency: currency,
        naira_amount: nairaAmount,
        nc_amount: ncAmount,
        exchange_rate: usdToNgn,
        wallet_address: walletAddress.toLowerCase(),
        status: "processing"
      })
      .select()
      .single();

    if (txError) {
      console.error("[WITHDRAWAL] ❌ Failed to create transaction record:", txError);
      console.error("[WITHDRAWAL] Error details:", JSON.stringify(txError, null, 2));
      throw new Error(`Failed to create transaction record: ${txError.message || JSON.stringify(txError)}`);
    }

    console.log(`[WITHDRAWAL] ✅ Transaction record created with ID: ${txRecord.id}`);

    // Deduct from user balance first
    const { error: walletError } = await supabase
      .from("profiles")
      .update({
        wallet_balance: profile.wallet_balance - ncAmount,
        balance_withdrawable: profile.balance_withdrawable - ncAmount
      })
      .eq("user_id", user.id);

    if (walletError) {
      throw new Error("Failed to update wallet balance");
    }

    // Log wallet transaction
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      kind: "withdrawal",
      amount: -ncAmount,
      status: "processing",
      reference: `Crypto withdrawal: ${cryptoAmount} ${currency} to ${walletAddress}`
    });

    // Send blockchain transaction
    try {
      // Get master wallet encrypted key from database
      const { data: masterWalletData, error: masterWalletError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "master_wallet_encrypted")
        .single();

      if (masterWalletError || !masterWalletData) {
        throw new Error("Master wallet not initialized. Contact admin.");
      }

      // Decrypt master wallet private key
      const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
      const decryptedMasterKey = CryptoJS.AES.decrypt(
        masterWalletData.value,
        encryptionSecret
      ).toString(CryptoJS.enc.Utf8);

      if (!decryptedMasterKey) {
        throw new Error("Failed to decrypt master wallet key");
      }

      // Initialize provider with Forno (official Celo RPC)
      const provider = new ethers.JsonRpcProvider(CELO_RPC);
      const wallet = new ethers.Wallet(decryptedMasterKey, provider);
      
      console.log(`[WITHDRAWAL] Using master wallet: ${wallet.address}`);
      console.log(`[WITHDRAWAL] Amount to send: ${cryptoAmount} ${currency}`);

      let txHash = "";

      if (currency === "cUSD" || currency === "USDT") {
        // Send cUSD or USDT (ERC-20 tokens)
        const tokenAddress = currency === "cUSD" ? CUSD_ADDRESS : USDT_ADDRESS;
        const tokenAbi = [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address account) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);
        
        // Get token decimals
        const decimals = await tokenContract.decimals();
        console.log(`[WITHDRAWAL] 📊 ${currency} decimals: ${decimals}`);
        
        // Calculate amount based on decimals - ensure proper string conversion
        const amountString = toAmountString(cryptoAmount, Number(decimals));
        console.log(`[WITHDRAWAL] 📊 Amount string: ${amountString}`);
        const amount = ethers.parseUnits(amountString, decimals);
        console.log(`[WITHDRAWAL] 📊 Requesting ${cryptoAmount} ${currency} (${amount.toString()} wei)`);
        
        // Check master wallet balance with retries
        let masterBalance = BigInt(0);
        let balanceCheckAttempts = 3;
        
        for (let i = 0; i < balanceCheckAttempts; i++) {
          try {
            masterBalance = await tokenContract.balanceOf(wallet.address);
            const balanceFormatted = formatBigInt(masterBalance, Number(decimals));
            console.log(`[WITHDRAWAL] 💵 Master wallet ${currency} balance (attempt ${i+1}/${balanceCheckAttempts}): ${balanceFormatted}`);
            break;
          } catch (balanceErr) {
            console.error(`[WITHDRAWAL] ❌ Balance check attempt ${i+1} failed:`, balanceErr);
            if (i === balanceCheckAttempts - 1) throw balanceErr;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        const masterBalanceFormatted = formatBigInt(masterBalance, Number(decimals));
        console.log(`[WITHDRAWAL] 💰 Master wallet has: ${masterBalanceFormatted} ${currency}`);
        console.log(`[WITHDRAWAL] 📤 User wants: ${cryptoAmount} ${currency}`);
        
        if (masterBalance < amount) {
          const shortfall = formatBigInt(amount - masterBalance, Number(decimals));
          throw new Error(
            `❌ Insufficient master wallet ${currency} balance!\n` +
            `Has: ${masterBalanceFormatted} ${currency}\n` +
            `Needs: ${cryptoAmount} ${currency}\n` +
            `Short: ${shortfall} ${currency}\n\n` +
            `💡 Admin: Please deposit ${currency} to master wallet: ${wallet.address}`
          );
        }
        
        console.log(`[WITHDRAWAL] ✅ Sufficient balance, proceeding with transfer...`);
        const tx = await tokenContract.transfer(walletAddress, amount);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        console.log(`[WITHDRAWAL] ✅ ${currency} sent successfully: ${txHash}`);
      } else {
        // Send native CELO
        const amountString = toAmountString(cryptoAmount, 18);
        console.log(`[WITHDRAWAL] 📊 CELO amount string: ${amountString}`);
        const amount = ethers.parseEther(amountString);
        
        // Check master wallet CELO balance
        const masterBalance = await provider.getBalance(wallet.address);
        const masterBalanceFormatted = formatBigInt(masterBalance, 18);
        console.log(`[WITHDRAWAL] Master wallet CELO balance: ${masterBalanceFormatted}`);
        console.log(`[WITHDRAWAL] Amount needed: ${cryptoAmount} CELO`);
        
        if (masterBalance < amount) {
          throw new Error(`Insufficient master wallet CELO. Has: ${masterBalanceFormatted} CELO, Needs: ${cryptoAmount} CELO. Please fund the master wallet.`);
        }
        
        const tx = await wallet.sendTransaction({
          to: walletAddress,
          value: amount
        });
        const receipt = await tx.wait();
        txHash = receipt.hash;
        console.log(`[WITHDRAWAL] ✅ CELO sent: ${txHash}`);
      }

      if (!txHash) {
        throw new Error('Transaction not completed or failed - no tx hash returned');
      }

      console.log("✅ Transaction sent successfully:", txHash);

      // Update transaction record as completed
      await supabase
        .from("crypto_transactions")
        .update({
          status: "completed",
          tx_hash: txHash,
          completed_at: new Date().toISOString()
        })
        .eq("id", txRecord.id);

      // Update wallet transaction
      await supabase
        .from("wallet_transactions")
        .update({
          status: "completed",
          reference: `Crypto withdrawal: ${cryptoAmount} ${currency} (Tx: ${txHash})`
        })
        .eq("user_id", user.id)
        .eq("kind", "withdrawal")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1);

      // Send Telegram notification
      if (profile.telegram_user_id) {
        try {
          const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: profile.telegram_user_id,
                text: `✅ *Withdrawal Successful!*\n\n` +
                      `Amount: ${cryptoAmount.toFixed(4)} ${currency}\n` +
                      `Deducted: ₦${ncAmount} NC\n` +
                      `To: ${walletAddress}\n` +
                      `Tx Hash: ${txHash}\n\n` +
                      `Funds should arrive shortly! 🎉`,
                parse_mode: "Markdown"
              })
            });
          }
        } catch (notifError) {
          console.error("Error sending Telegram notification:", notifError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        txHash,
        cryptoAmount,
        currency
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    } catch (blockchainError) {
      console.error("Blockchain error:", blockchainError);

      // Refund user on blockchain error
      await supabase
        .from("profiles")
        .update({
          wallet_balance: profile.wallet_balance,
          balance_withdrawable: profile.balance_withdrawable
        })
        .eq("user_id", user.id);

      await supabase
        .from("crypto_transactions")
        .update({
          status: "failed",
          error_message: blockchainError.message
        })
        .eq("id", txRecord.id);

      throw new Error(`Blockchain transaction failed: ${blockchainError.message}`);
    }
  } catch (error) {
    console.error("Withdrawal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
