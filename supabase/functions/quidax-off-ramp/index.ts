import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

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
        // GET /api/v1/merchants/purchase_limits/sell?token_symbol=USDT
        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_limits/sell?token_symbol=USDT`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_quote': {
        // GET /api/v1/merchants/purchase_quotes/sell?token=USDT&currency=NGN&token_amount=X&token_network=BEP20
        const { tokenAmount } = params;
        if (!tokenAmount || tokenAmount <= 0) {
          throw new Error("Invalid token amount");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/sell?token=USDT&currency=NGN&token_amount=${tokenAmount}&token_network=BEP20`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'initiate_withdrawal': {
        // Initiate off-ramp: Convert NC → USDT → Fiat (NGN)
        const { ncAmount, bankDetails } = params;

        if (!ncAmount || ncAmount <= 0) {
          throw new Error("Invalid NC amount");
        }

        if (!bankDetails || !bankDetails.account_number || !bankDetails.bank_code || !bankDetails.account_name) {
          throw new Error("Missing bank details");
        }

        console.log(`[QUIDAX_OFF_RAMP] Processing ${ncAmount} NC withdrawal for user ${user.id}`);

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance, balance_withdrawable")
          .eq("user_id", user.id)
          .single();

        if (!profile || profile.balance_withdrawable < ncAmount) {
          throw new Error("Insufficient withdrawable balance");
        }

        // Convert NC to USDT (assuming 1 NC = 1 NGN, need exchange rate)
        const exchangeRateResponse = await fetch("https://v6.exchangerate-api.com/v6/c06b378e6d590d4c22aa2998/latest/USD");
        const exchangeRateData = await exchangeRateResponse.json();
        const usdToNgn = exchangeRateData.conversion_rates?.NGN || 1600;
        const usdtAmount = ncAmount / usdToNgn;

        console.log(`[QUIDAX_OFF_RAMP] Converting ${ncAmount} NC → ${usdtAmount} USDT`);

        // Get Quidax deposit address for USDT
        const quoteResponse = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/sell?token=USDT&currency=NGN&token_amount=${usdtAmount}&token_network=BEP20`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const quoteData = await quoteResponse.json();

        if (!quoteData.deposit_address) {
          throw new Error("Failed to get Quidax deposit address");
        }

        console.log(`[QUIDAX_OFF_RAMP] Quidax deposit address: ${quoteData.deposit_address}`);

        // Send USDT from master wallet to Quidax
        const { data: masterWalletData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "master_wallet_encrypted")
          .single();

        if (!masterWalletData) {
          throw new Error("Master wallet not configured");
        }

        const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
        const masterPrivateKey = CryptoJS.AES.decrypt(masterWalletData.value, encryptionSecret).toString(CryptoJS.enc.Utf8);

        const provider = new ethers.JsonRpcProvider(CELO_RPC);
        const masterWallet = new ethers.Wallet(masterPrivateKey, provider);

        // Send USDT to Quidax
        const tokenContract = new ethers.Contract(
          USDT_ADDRESS,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
          ],
          masterWallet
        );

        const decimals = await tokenContract.decimals();
        const amount = ethers.parseUnits(usdtAmount.toFixed(Number(decimals)), decimals);

        console.log(`[QUIDAX_OFF_RAMP] Sending ${usdtAmount} USDT to Quidax...`);
        const tx = await tokenContract.transfer(quoteData.deposit_address, amount);
        const receipt = await tx.wait();
        const txHash = receipt.hash;

        console.log(`[QUIDAX_OFF_RAMP] ✅ USDT sent to Quidax: ${txHash}`);

        // Initiate off-ramp transaction with Quidax
        const offRampResponse = await fetch(
          `${QUIDAX_BASE_URL}/off_ramp_transaction`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${QUIDAX_PRIVATE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: "USDT",
              token_network: "BEP20",
              currency: "NGN",
              token_amount: usdtAmount,
              transaction_hash: txHash,
              bank_details: bankDetails,
              callback_url: `${SUPABASE_URL}/functions/v1/quidax-webhook`
            })
          }
        );

        const offRampData = await offRampResponse.json();
        console.log(`[QUIDAX_OFF_RAMP] Off-ramp initiated:`, offRampData);

        // Deduct from user balance
        await supabase
          .from("profiles")
          .update({
            wallet_balance: profile.wallet_balance - ncAmount,
            balance_withdrawable: profile.balance_withdrawable - ncAmount
          })
          .eq("user_id", user.id);

        // Log transaction
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          kind: "withdrawal",
          amount: -ncAmount,
          status: "processing",
          reference: `Quidax Off-Ramp: ${ncAmount} NC → ${usdtAmount} USDT`
        });

        // Store Quidax transaction
        if (offRampData.reference) {
          await supabase.from('quidax_transactions').insert({
            user_id: user.id,
            transaction_type: 'off_ramp',
            reference: offRampData.reference,
            fiat_amount: ncAmount,
            fiat_currency: 'NGN',
            token: 'USDT',
            token_amount: usdtAmount,
            tx_hash: txHash,
            status: 'processing',
            quidax_data: offRampData
          });
        }

        return new Response(JSON.stringify({
          success: true,
          reference: offRampData.reference,
          txHash,
          usdtAmount,
          fiatAmount: quoteData.fiat_amount || ncAmount
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_transaction_status': {
        // GET /api/v1/merchants/off_ramp_transaction/{reference}
        const { reference } = params;
        if (!reference) {
          throw new Error("Missing reference");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/off_ramp_transaction/${reference}`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
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
