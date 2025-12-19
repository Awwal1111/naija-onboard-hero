import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QUIDAX_PUBLIC_KEY = Deno.env.get("QUIDAX_PUBLIC_KEY")!;
const QUIDAX_PRIVATE_KEY = Deno.env.get("QUIDAX_PRIVATE_KEY")!;
const QUIDAX_BASE_URL = "https://ramp-be.quidax.io/api/v1/merchants";
const USDT_ADDRESS = "0x48065fbBe25f71C9282ddf5e1cD6d6A887483D5e"; // Celo USDT
const CELO_RPC = "https://forno.celo.org";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * QUIDAX OFF-RAMP - Withdraw NC to Bank via Quidax
 * 
 * CRITICAL FIX: Use Quidax quote for exact NGN amount user will receive
 * 
 * Flow:
 * 1. User wants to withdraw X NC (= ₦X)
 * 2. Get quote from Quidax: how much USDT needed for ₦X
 * 3. Deduct X NC from user
 * 4. Send USDT to Quidax
 * 5. Quidax sends ₦X to user's bank (minus their fees)
 */

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

    const { action, ...params } = await req.json();
    console.log(`[QUIDAX_OFF_RAMP] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case 'get_purchase_limits': {
        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_limits/sell?token_symbol=USDT`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_quote': {
        // Get quote for selling USDT → NGN
        const { tokenAmount } = params;
        if (!tokenAmount || tokenAmount <= 0) {
          throw new Error("Invalid token amount");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/sell?token=USDT&currency=NGN&token_amount=${tokenAmount}&token_network=CELO`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const data = await response.json();
        console.log(`[QUIDAX_OFF_RAMP] Quote response:`, JSON.stringify(data));
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'initiate_withdrawal': {
        const { ncAmount, bankDetails } = params;

        if (!ncAmount || ncAmount <= 0) {
          throw new Error("Invalid NC amount");
        }

        if (!bankDetails || !bankDetails.account_number || !bankDetails.bank_code || !bankDetails.account_name) {
          throw new Error("Missing bank details");
        }

        console.log(`[QUIDAX_OFF_RAMP] ========== INITIATING WITHDRAWAL ==========`);
        console.log(`[QUIDAX_OFF_RAMP] NC Amount: ${ncAmount}`);

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance, balance_withdrawable")
          .eq("user_id", user.id)
          .single();

        if (!profile || profile.balance_withdrawable < ncAmount) {
          throw new Error("Insufficient withdrawable balance");
        }

        // Get LIVE exchange rate to calculate USDT amount
        let usdToNgn = 1600;
        try {
          const rateResponse = await fetch(
            "https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD",
            { signal: AbortSignal.timeout(5000) }
          );
          if (rateResponse.ok) {
            const rateData = await rateResponse.json();
            if (rateData.conversion_rates?.NGN) {
              usdToNgn = rateData.conversion_rates.NGN;
            }
          }
        } catch (e) {
          console.log(`[QUIDAX_OFF_RAMP] Using fallback rate: ${usdToNgn}`);
        }

        // NC = NGN, so calculate USDT needed
        // User wants to receive ₦ncAmount, calculate USDT to sell
        const usdtAmount = ncAmount / usdToNgn;
        
        console.log(`[QUIDAX_OFF_RAMP] Exchange rate: ₦${usdToNgn}/USDT`);
        console.log(`[QUIDAX_OFF_RAMP] USDT to sell: ${usdtAmount.toFixed(6)}`);

        // Get Quidax quote to see actual NGN user will receive
        const quoteResponse = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/sell?token=USDT&currency=NGN&token_amount=${usdtAmount.toFixed(6)}&token_network=CELO`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const quoteData = await quoteResponse.json();
        console.log(`[QUIDAX_OFF_RAMP] Quidax quote:`, JSON.stringify(quoteData));

        const quidaxFiatAmount = parseFloat(quoteData.data?.fiat_amount || quoteData.fiat_amount || '0');
        const depositAddress = quoteData.data?.deposit_address || quoteData.deposit_address;

        if (!depositAddress) {
          throw new Error("Failed to get Quidax deposit address");
        }

        console.log(`[QUIDAX_OFF_RAMP] Quidax deposit address: ${depositAddress}`);
        console.log(`[QUIDAX_OFF_RAMP] User will receive: ₦${quidaxFiatAmount} (after Quidax fees)`);

        // Get master wallet from database (encrypted)
        const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_SECRET') || 'default_secret';
        const { data: masterWalletData, error: masterWalletError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'master_wallet_encrypted')
          .single();

        if (masterWalletError || !masterWalletData?.value) {
          console.error('[QUIDAX_OFF_RAMP] Master wallet not found:', masterWalletError);
          throw new Error("Master wallet not configured. Please contact support.");
        }

        let masterPrivateKey: string;
        try {
          masterPrivateKey = CryptoJS.AES.decrypt(masterWalletData.value, encryptionSecret).toString(CryptoJS.enc.Utf8);
          if (!masterPrivateKey || masterPrivateKey.length < 64) {
            throw new Error('Decryption failed');
          }
        } catch (e) {
          console.error('[QUIDAX_OFF_RAMP] Failed to decrypt master wallet');
          throw new Error("Master wallet decryption failed. Please contact support.");
        }

        const provider = new ethers.JsonRpcProvider(CELO_RPC);
        const masterWallet = new ethers.Wallet(masterPrivateKey, provider);

        console.log(`[QUIDAX_OFF_RAMP] Master wallet: ${masterWallet.address}`);

        // Send USDT to Quidax
        const tokenContract = new ethers.Contract(
          USDT_ADDRESS,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function balanceOf(address account) view returns (uint256)"
          ],
          masterWallet
        );

        // Check balance
        const masterBalance = await tokenContract.balanceOf(masterWallet.address);
        const usdtAmountWei = ethers.parseUnits(usdtAmount.toFixed(6), 6);
        
        console.log(`[QUIDAX_OFF_RAMP] Master USDT balance: ${ethers.formatUnits(masterBalance, 6)}`);

        if (masterBalance < usdtAmountWei) {
          throw new Error(`Insufficient USDT in master wallet. Available: ${ethers.formatUnits(masterBalance, 6)}, Required: ${usdtAmount.toFixed(6)}`);
        }

        console.log(`[QUIDAX_OFF_RAMP] Sending ${usdtAmount.toFixed(6)} USDT to Quidax...`);
        const tx = await tokenContract.transfer(depositAddress, usdtAmountWei);
        const receipt = await tx.wait();
        const txHash = receipt.hash;

        console.log(`[QUIDAX_OFF_RAMP] ✅ USDT sent to Quidax: ${txHash}`);

        // Deduct from user balance
        await supabase
          .from("profiles")
          .update({
            wallet_balance: profile.wallet_balance - ncAmount,
            balance_withdrawable: profile.balance_withdrawable - ncAmount
          })
          .eq("user_id", user.id);

        console.log(`[QUIDAX_OFF_RAMP] Deducted ${ncAmount} NC from user`);

        // Log transaction with accurate info
        const reference = `NL_SELL_${Date.now()}_${user.id.slice(0, 8)}`;
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          kind: "quidax_withdrawal",
          amount: -ncAmount,
          status: "processing",
          reference: `Withdraw ${ncAmount} NC → ${usdtAmount.toFixed(4)} USDT → ₦${quidaxFiatAmount.toLocaleString()} @ ₦${usdToNgn}/USDT`
        });

        // Store Quidax transaction
        await supabase.from('quidax_transactions').insert({
          user_id: user.id,
          transaction_type: 'off_ramp',
          reference: reference,
          fiat_amount: quidaxFiatAmount,
          fiat_currency: 'NGN',
          token: 'USDT',
          token_amount: usdtAmount,
          tx_hash: txHash,
          status: 'processing',
          quidax_data: { 
            quote: quoteData, 
            nc_deducted: ncAmount, 
            exchange_rate: usdToNgn,
            deposit_address: depositAddress 
          }
        });

        // Send notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'transaction',
          title: '💸 Withdrawal Processing',
          message: `Your withdrawal of ${ncAmount.toLocaleString()} NC is being processed. You'll receive approximately ₦${quidaxFiatAmount.toLocaleString()} in your bank account.`,
          metadata: { reference, ncAmount, fiatAmount: quidaxFiatAmount, txHash }
        });

        console.log(`[QUIDAX_OFF_RAMP] ========== WITHDRAWAL INITIATED ==========`);

        return new Response(JSON.stringify({
          success: true,
          reference,
          txHash,
          usdtAmount: usdtAmount.toFixed(6),
          fiatAmount: quidaxFiatAmount,
          ncDeducted: ncAmount,
          exchangeRate: usdToNgn,
          message: `Withdrawal processing. You'll receive ₦${quidaxFiatAmount.toLocaleString()} in your bank.`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_transaction_status': {
        const { reference } = params;
        if (!reference) {
          throw new Error("Missing reference");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/off_ramp_transaction/${reference}`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Quidax Off-Ramp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
