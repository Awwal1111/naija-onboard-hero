import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import { sendAllNotifications } from '../_shared/notification-helper.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CELO_RPC = "https://forno.celo.org";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD";
const MIN_WITHDRAWAL_NC = 100;

// Token addresses on Celo mainnet (checksummed)
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"; // Tether USD on Celo Mainnet

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
      .select("wallet_balance, balance_withdrawable, full_name, telegram_user_id, celo_wallet_address, encrypted_wallet")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.balance_withdrawable < ncAmount) {
      throw new Error("Insufficient withdrawable balance");
    }

    // Get exchange rate (USD to NGN) with retry logic
    let usdToNgn = 1600; // Default fallback
    let exchangeRateSource = "fallback";
    
    try {
      const rateResponse = await fetch(EXCHANGE_RATE_API, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        if (rateData.conversion_rates?.NGN) {
          usdToNgn = rateData.conversion_rates.NGN;
          exchangeRateSource = "exchangerate-api.com";
          console.log(`[EXCHANGE_RATE] ✅ Live rate: 1 USD = ${usdToNgn} NGN (${exchangeRateSource})`);
        }
      }
    } catch (rateError) {
      console.error(`[EXCHANGE_RATE] ⚠️ API failed, using fallback: ${rateError.message}`);
    }

    // Calculate crypto amount to send
    const nairaAmount = ncAmount;
    let cryptoAmount = 0;
    let usdValue = 0;
    
    console.log(`[CONVERSION] Withdrawing ${nairaAmount} NC (NGN) to ${currency}`);

    if (currency === "cUSD" || currency === "USDT") {
      usdValue = nairaAmount / usdToNgn; // Convert NGN to USD
      cryptoAmount = usdValue; // 1:1 for stablecoins
      console.log(`[CONVERSION] ${nairaAmount} NGN ÷ ${usdToNgn} = ${usdValue.toFixed(2)} USD = ${cryptoAmount.toFixed(6)} ${currency}`);
    } else if (currency === "CELO") {
      // Fetch real-time CELO price with timeout
      let celoUsdPrice = 0.65; // Fallback
      try {
        const celoResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd",
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (celoResponse.ok) {
          const celoData = await celoResponse.json();
          if (celoData.celo?.usd) {
            celoUsdPrice = celoData.celo.usd;
            console.log(`[CELO_PRICE] ✅ Live price: $${celoUsdPrice} USD`);
          }
        }
      } catch (priceError) {
        console.error(`[CELO_PRICE] ⚠️ API failed, using fallback $${celoUsdPrice}: ${priceError.message}`);
      }
      
      usdValue = nairaAmount / usdToNgn; // Convert NGN to USD first
      cryptoAmount = usdValue / celoUsdPrice; // Then USD to CELO
      console.log(`[CONVERSION] ${nairaAmount} NGN ÷ ${usdToNgn} = ${usdValue.toFixed(2)} USD ÷ $${celoUsdPrice} = ${cryptoAmount.toFixed(6)} CELO`);
    }

    console.log(`[WITHDRAWAL] Final: ${ncAmount} NC → ${cryptoAmount.toFixed(6)} ${currency}`);

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
      // Initialize provider with Forno (official Celo RPC)
      const provider = new ethers.JsonRpcProvider(CELO_RPC);
      const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
      
      let wallet: ethers.Wallet;
      let walletSource = "master"; // "user" or "master"
      
      // STEP 1: Check if user has their own wallet with funds
      if (profile.celo_wallet_address && profile.encrypted_wallet) {
        try {
          console.log(`[WITHDRAWAL] 🔍 User has personal wallet: ${profile.celo_wallet_address}`);
          
          // Decrypt user's private key
          const decryptedUserKey = CryptoJS.AES.decrypt(
            profile.encrypted_wallet,
            encryptionSecret
          ).toString(CryptoJS.enc.Utf8);
          
          if (decryptedUserKey) {
            const userWallet = new ethers.Wallet(decryptedUserKey, provider);
            console.log(`[WITHDRAWAL] 🔓 User wallet decrypted successfully`);
            
            // Check user's wallet balance for the requested currency
            let userBalance = BigInt(0);
            let hasEnough = false;
            
            if (currency === "cUSD" || currency === "USDT") {
              const tokenAddress = currency === "cUSD" ? CUSD_ADDRESS : USDT_ADDRESS;
              const tokenAbi = [
                "function balanceOf(address account) view returns (uint256)",
                "function decimals() view returns (uint8)"
              ];
              const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, userWallet);
              const decimals = await tokenContract.decimals();
              userBalance = await tokenContract.balanceOf(userWallet.address);
              
              const amountString = toAmountString(cryptoAmount, Number(decimals));
              const requiredAmount = ethers.parseUnits(amountString, decimals);
              hasEnough = userBalance >= requiredAmount;
              
              console.log(`[WITHDRAWAL] 💰 User's ${currency} balance: ${formatBigInt(userBalance, Number(decimals))}`);
              console.log(`[WITHDRAWAL] 📊 Required: ${cryptoAmount} ${currency}`);
              console.log(`[WITHDRAWAL] ✅ Has enough: ${hasEnough}`);
            } else {
              // Native CELO
              userBalance = await provider.getBalance(userWallet.address);
              const amountString = toAmountString(cryptoAmount, 18);
              const requiredAmount = ethers.parseEther(amountString);
              hasEnough = userBalance >= requiredAmount;
              
              console.log(`[WITHDRAWAL] 💰 User's CELO balance: ${formatBigInt(userBalance, 18)}`);
              console.log(`[WITHDRAWAL] 📊 Required: ${cryptoAmount} CELO`);
              console.log(`[WITHDRAWAL] ✅ Has enough: ${hasEnough}`);
            }
            
            // If user has enough, use their wallet
            if (hasEnough) {
              wallet = userWallet;
              walletSource = "user";
              console.log(`[WITHDRAWAL] ✅ Using USER'S personal wallet for withdrawal`);
            } else {
              console.log(`[WITHDRAWAL] ⚠️ User wallet has insufficient balance, falling back to master wallet`);
              // Continue to master wallet below
            }
          }
        } catch (userWalletError) {
          console.error(`[WITHDRAWAL] ⚠️ Error checking user wallet:`, userWalletError);
          console.log(`[WITHDRAWAL] 🔄 Falling back to master wallet`);
          // Continue to master wallet below
        }
      } else {
        console.log(`[WITHDRAWAL] ℹ️ User has no personal wallet, using master wallet`);
      }
      
      // STEP 2: If not using user wallet, use master wallet
      if (walletSource === "master") {
        const { data: masterWalletData, error: masterWalletError } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "master_wallet_encrypted")
          .single();

        if (masterWalletError || !masterWalletData) {
          throw new Error("Master wallet not initialized. Contact admin.");
        }

        // Decrypt master wallet private key
        const decryptedMasterKey = CryptoJS.AES.decrypt(
          masterWalletData.value,
          encryptionSecret
        ).toString(CryptoJS.enc.Utf8);

        if (!decryptedMasterKey) {
          throw new Error("Failed to decrypt master wallet key");
        }

        wallet = new ethers.Wallet(decryptedMasterKey, provider);
        console.log(`[WITHDRAWAL] 🏦 Using MASTER wallet: ${wallet.address}`);
      }
      
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

      // Send all notifications (in-app, email with PDF, push, Telegram)
      await sendAllNotifications(supabase, {
        userId: user.id,
        type: 'withdrawal_completed',
        title: '✅ Withdrawal Successful',
        message: `Your withdrawal of ₦${ncAmount.toLocaleString()} NC (${cryptoAmount.toFixed(4)} ${currency}) has been sent to ${walletAddress}`,
        amount: ncAmount,
        metadata: {
          reference: txHash,
          cryptoAmount: cryptoAmount.toFixed(4),
          currency,
          walletAddress,
          walletSource,
          transactionType: 'Crypto Withdrawal',
          actionUrl: '/dashboard'
        }
      });

      console.log(`[NOTIFICATION] ✅ All notifications sent for withdrawal ${txHash}`);

      return new Response(JSON.stringify({
        success: true,
        txHash,
        cryptoAmount,
        currency,
        source: walletSource // Indicate which wallet was used
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
