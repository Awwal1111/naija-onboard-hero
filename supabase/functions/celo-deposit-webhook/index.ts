import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALCHEMY_API_KEY = Deno.env.get("ALCHEMY_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CELO DEPOSIT WEBHOOK - LOGGING ONLY
 * 
 * This webhook receives notifications from Alchemy about incoming deposits.
 * 
 * IMPORTANT: This webhook does NOT credit NC to users!
 * NC crediting is handled ONLY by check-celo-deposits (polling) to prevent double-credits.
 * 
 * This webhook only:
 * 1. Logs the transaction for audit trail
 * 2. Verifies the transaction on blockchain
 * 3. Records in crypto_transactions with status 'pending_credit'
 * 
 * The check-celo-deposits function will:
 * 1. Detect the new balance
 * 2. Credit the user
 * 3. Sweep funds to master wallet
 */

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
    console.log("[ALCHEMY-WEBHOOK] Received webhook:", JSON.stringify(webhookData));

    const activities = webhookData.event?.activity || [];

    for (const activity of activities) {
      const txHash = activity.hash;
      const toAddress = activity.toAddress.toLowerCase();
      const rawAsset = activity.asset;
      
      // Parse amount
      let cryptoAmount = activity.value;
      if (activity.rawContract && activity.rawContract.decimal) {
        const decimals = parseInt(activity.rawContract.decimal);
        cryptoAmount = parseFloat(ethers.formatUnits(activity.value.toString(), decimals));
      }
      
      // Normalize asset names
      let asset = rawAsset;
      const contractAddress = activity.rawContract?.address?.toLowerCase();
      
      if (contractAddress === "0x765de816845861e75a25fca122bb6898b8b1282a") {
        asset = "cUSD";
      } else if (contractAddress === "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e") {
        asset = "USDT";
      } else if (rawAsset === "ETH") {
        asset = "CELO";
      }
      
      console.log(`[ALCHEMY-WEBHOOK] Detected: ${cryptoAmount} ${asset} to ${toAddress}, tx: ${txHash}`);

      // Check if transaction already logged
      const { data: existing } = await supabase
        .from("crypto_transactions")
        .select("id, status")
        .eq("tx_hash", txHash)
        .maybeSingle();

      if (existing) {
        console.log(`[ALCHEMY-WEBHOOK] Transaction already logged: ${txHash} (status: ${existing.status})`);
        continue;
      }

      // Verify transaction on blockchain
      let verificationSuccess = false;
      
      if (ALCHEMY_API_KEY) {
        try {
          const alchemyResponse = await fetch(
            `https://celo-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getTransactionReceipt',
                params: [txHash]
              })
            }
          );

          const alchemyData = await alchemyResponse.json();
          if (alchemyData.result && alchemyData.result.status === '0x1') {
            verificationSuccess = true;
            console.log(`[ALCHEMY-WEBHOOK] ✅ Transaction verified on blockchain`);
          }
        } catch (e: any) {
          console.log(`[ALCHEMY-WEBHOOK] Verification failed: ${e.message}`);
        }
      }

      if (!verificationSuccess) {
        // Try Forno as fallback
        try {
          const fornoResponse = await fetch('https://forno.celo.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            })
          });

          const fornoData = await fornoResponse.json();
          if (fornoData.result && fornoData.result.status === '0x1') {
            verificationSuccess = true;
            console.log(`[ALCHEMY-WEBHOOK] ✅ Transaction verified via Forno`);
          }
        } catch (e: any) {
          console.log(`[ALCHEMY-WEBHOOK] Forno verification failed: ${e.message}`);
        }
      }

      if (!verificationSuccess) {
        console.log(`[ALCHEMY-WEBHOOK] ❌ Could not verify transaction: ${txHash}`);
        continue;
      }

      // Find user by wallet address
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("celo_wallet_address", toAddress)
        .maybeSingle();

      if (!profile) {
        console.log(`[ALCHEMY-WEBHOOK] ⚠️ No user found for wallet: ${toAddress}`);
        // Log as unmatched for admin review
        await supabase.from("crypto_transactions").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          transaction_type: "deposit",
          crypto_amount: cryptoAmount,
          crypto_currency: asset,
          naira_amount: 0,
          nc_amount: 0,
          exchange_rate: 0,
          wallet_address: toAddress,
          tx_hash: txHash,
          status: "unmatched",
          error_message: `Deposit detected but no user found for wallet: ${toAddress}`
        });
        continue;
      }

      console.log(`[ALCHEMY-WEBHOOK] ✅ User found: ${profile.full_name} (${profile.user_id})`);
      
      // Log the transaction as detected - DO NOT CREDIT HERE
      // The check-celo-deposits polling will handle the actual credit
      await supabase.from("crypto_transactions").insert({
        user_id: profile.user_id,
        transaction_type: "deposit",
        crypto_amount: cryptoAmount,
        crypto_currency: asset,
        naira_amount: 0, // Will be calculated by check-celo-deposits
        nc_amount: 0,    // Will be credited by check-celo-deposits
        exchange_rate: 0,
        wallet_address: toAddress,
        tx_hash: txHash,
        status: "detected", // Not completed - waiting for polling to credit
        error_message: "Transaction detected by webhook. NC credit pending via polling."
      });

      console.log(`[ALCHEMY-WEBHOOK] 📝 Transaction logged as detected. NC credit will happen via check-celo-deposits polling.`);
      
      // Also update any pending Quidax transaction status
      await supabase
        .from('quidax_transactions')
        .update({
          status: 'crypto_received',
          quidax_data: { 
            webhook_detected_at: new Date().toISOString(),
            tx_hash: txHash,
            crypto_amount: cryptoAmount,
            asset: asset
          }
        })
        .eq('wallet_address', toAddress.toLowerCase())
        .eq('status', 'pending');
    }

    console.log(`[ALCHEMY-WEBHOOK] ✅ Webhook processed`);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("[ALCHEMY-WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
