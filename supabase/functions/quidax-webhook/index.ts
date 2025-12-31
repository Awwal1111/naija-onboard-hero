import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * QUIDAX WEBHOOK - STATUS UPDATES ONLY
 * 
 * This webhook receives notifications from Quidax about transaction status changes.
 * 
 * IMPORTANT: For ON-RAMP (buying crypto):
 * - This webhook ONLY updates the quidax_transactions status
 * - NC crediting and sweeping are handled by celo-deposit-webhook when 
 *   the crypto arrives in the user's Celo wallet
 * - This prevents double-crediting and ensures sweep always happens
 * 
 * For OFF-RAMP (selling crypto):
 * - Updates status and handles refunds if transaction fails
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log("[QUIDAX_WEBHOOK] Received webhook:", JSON.stringify(webhookData));

    const { reference, status, transaction_type, token_amount, fiat_amount } = webhookData;

    if (!reference) {
      console.error("[QUIDAX_WEBHOOK] No reference in webhook data");
      return new Response(JSON.stringify({ error: "No reference" }), { status: 400 });
    }

    // Find transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('quidax_transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    if (txError || !transaction) {
      console.error("[QUIDAX_WEBHOOK] Transaction not found:", reference);
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404 });
    }

    console.log(`[QUIDAX_WEBHOOK] Processing ${transaction_type || transaction.transaction_type} for user ${transaction.user_id}`);

    // Update transaction status with webhook data
    const { error: updateError } = await supabase
      .from('quidax_transactions')
      .update({
        status,
        quidax_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference);

    if (updateError) {
      console.error("[QUIDAX_WEBHOOK] Failed to update transaction:", updateError);
    }

    const txType = transaction_type || transaction.transaction_type;

    if (txType === 'on_ramp') {
      // ON-RAMP: User bought crypto with fiat via Quidax
      // NC crediting and sweep will be handled by celo-deposit-webhook
      // when the crypto arrives in user's Celo wallet
      
      if (status === 'completed' || status === 'success') {
        console.log(`[QUIDAX_WEBHOOK] ✅ On-ramp completed via Quidax`);
        console.log(`[QUIDAX_WEBHOOK] Crypto will arrive in user wallet shortly`);
        console.log(`[QUIDAX_WEBHOOK] celo-deposit-webhook will handle: NC credit + sweep`);
        
        // Send notification with email via edge function
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              userId: transaction.user_id,
              type: 'deposit',
              title: 'Crypto Purchase Complete! 🎉',
              message: `Your purchase of ${token_amount || transaction.token_amount} USDT is being processed. You'll be credited shortly when it arrives in your wallet.`,
              metadata: { 
                reference, 
                status, 
                fiat_amount: fiat_amount || transaction.fiat_amount,
                transactionType: 'Deposit',
                amount: `₦${fiat_amount || transaction.fiat_amount}`
              },
              sendEmail: true,
              emailTemplate: 'transaction',
              attachPDF: true
            })
          });
          console.log(`[QUIDAX_WEBHOOK] Email notification sent for on-ramp`);
        } catch (emailErr) {
          console.error(`[QUIDAX_WEBHOOK] Failed to send email notification:`, emailErr);
          // Fallback to direct insert
          await supabase.from('notifications').insert({
            user_id: transaction.user_id,
            type: 'transaction',
            title: 'Crypto Purchase Complete! 🎉',
            message: `Your purchase of ${token_amount || transaction.token_amount} USDT is being processed. You'll be credited shortly when it arrives in your wallet.`,
            metadata: { reference, status, fiat_amount: fiat_amount || transaction.fiat_amount }
          });
        }
        
      } else if (status === 'failed' || status === 'cancelled') {
        console.log(`[QUIDAX_WEBHOOK] ❌ On-ramp failed: ${reference}`);
        
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Deposit Failed',
          message: `Your deposit of ₦${fiat_amount || transaction.fiat_amount} could not be completed. Please contact support if you were charged.`,
          metadata: { reference, status }
        });
      } else {
        console.log(`[QUIDAX_WEBHOOK] On-ramp status update: ${status}`);
      }
      
    } else if (txType === 'off_ramp') {
      // OFF-RAMP: User sold crypto for fiat
      
      if (status === 'completed' || status === 'success') {
        console.log(`[QUIDAX_WEBHOOK] ✅ Off-ramp completed: ${token_amount || transaction.token_amount} USDT → ${fiat_amount || transaction.fiat_amount} NGN`);

        // Update wallet transaction to completed
        const { error: wtError } = await supabase
          .from('wallet_transactions')
          .update({ status: 'completed' })
          .eq('user_id', transaction.user_id)
          .eq('kind', 'quidax_withdrawal')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (wtError) {
          console.error("[QUIDAX_WEBHOOK] Failed to update wallet transaction:", wtError);
        }

        // Send notification with email
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              userId: transaction.user_id,
              type: 'withdrawal',
              title: 'Withdrawal Successful! 💰',
              message: `₦${fiat_amount || transaction.fiat_amount} has been sent to your bank account. It should arrive shortly.`,
              metadata: { 
                reference, 
                fiat_amount: fiat_amount || transaction.fiat_amount, 
                token_amount: token_amount || transaction.token_amount,
                transactionType: 'Withdrawal',
                amount: `₦${fiat_amount || transaction.fiat_amount}`,
                status: 'Completed'
              },
              sendEmail: true,
              emailTemplate: 'transaction',
              attachPDF: true
            })
          });
          console.log(`[QUIDAX_WEBHOOK] Email notification sent for withdrawal`);
        } catch (emailErr) {
          console.error(`[QUIDAX_WEBHOOK] Failed to send email notification:`, emailErr);
          await supabase.from('notifications').insert({
            user_id: transaction.user_id,
            type: 'transaction',
            title: 'Withdrawal Successful! 💰',
            message: `₦${fiat_amount || transaction.fiat_amount} has been sent to your bank account. It should arrive shortly.`,
            metadata: { reference, fiat_amount: fiat_amount || transaction.fiat_amount, token_amount: token_amount || transaction.token_amount }
          });
        }
        
      } else if (status === 'failed' || status === 'cancelled') {
        console.log(`[QUIDAX_WEBHOOK] ❌ Off-ramp failed: ${reference}`);

        // Refund user
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', transaction.user_id)
          .single();

        if (profile) {
          const refundAmount = transaction.fiat_amount || 0;
          
          await supabase
            .from('profiles')
            .update({
              wallet_balance: profile.wallet_balance + refundAmount,
              balance_withdrawable: profile.balance_withdrawable + refundAmount
            })
            .eq('user_id', transaction.user_id);

          // Update wallet transaction to failed
          await supabase
            .from('wallet_transactions')
            .update({ status: 'failed' })
            .eq('user_id', transaction.user_id)
            .eq('kind', 'quidax_withdrawal')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

          // Log refund
          await supabase.from('wallet_transactions').insert({
            user_id: transaction.user_id,
            kind: 'refund',
            amount: refundAmount,
            status: 'completed',
            reference: `Quidax Off-Ramp Refund (Failed): ${reference}`
          });
          
          console.log(`[QUIDAX_WEBHOOK] Refunded ${refundAmount} NC to user`);
        }

        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Withdrawal Failed',
          message: `Your withdrawal of ₦${transaction.fiat_amount} could not be completed. Funds have been refunded to your wallet.`,
          metadata: { reference, status }
        });
      } else {
        console.log(`[QUIDAX_WEBHOOK] Off-ramp status update: ${status}`);
      }
    }

    console.log(`[QUIDAX_WEBHOOK] ✅ Webhook processed successfully`);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[QUIDAX_WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
