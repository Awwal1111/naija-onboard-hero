import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    console.log(`[QUIDAX_WEBHOOK] Processing ${transaction_type} for user ${transaction.user_id}`);

    // Update transaction status
    await supabase
      .from('quidax_transactions')
      .update({
        status,
        quidax_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference);

    if (transaction_type === 'on_ramp' || transaction.transaction_type === 'on_ramp') {
      // On-Ramp: User bought crypto with fiat
      if (status === 'completed' || status === 'success') {
        console.log(`[QUIDAX_WEBHOOK] On-ramp completed: ${fiat_amount} NGN → ${token_amount} USDT`);
        
        // The USDT will arrive at user's wallet automatically
        // Our existing celo-deposit-webhook will detect it and credit NC
        console.log(`[QUIDAX_WEBHOOK] USDT will be detected by deposit webhook at: ${transaction.wallet_address}`);

        // Send notification
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Deposit Successful! 🎉',
          message: `Your deposit of ₦${fiat_amount} is complete. USDT is being sent to your wallet and will be converted to NC shortly.`,
          metadata: { reference, fiat_amount, token_amount }
        });
      } else if (status === 'failed' || status === 'cancelled') {
        console.log(`[QUIDAX_WEBHOOK] On-ramp failed: ${reference}`);
        
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Deposit Failed',
          message: `Your deposit of ₦${fiat_amount} could not be completed. Please contact support if you were charged.`,
          metadata: { reference, status }
        });
      }
    } else if (transaction_type === 'off_ramp' || transaction.transaction_type === 'off_ramp') {
      // Off-Ramp: User sold crypto for fiat
      if (status === 'completed' || status === 'success') {
        console.log(`[QUIDAX_WEBHOOK] Off-ramp completed: ${token_amount} USDT → ${fiat_amount} NGN`);

        // Update wallet transaction to completed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'completed' })
          .eq('user_id', transaction.user_id)
          .eq('reference', `Quidax Off-Ramp: ${transaction.fiat_amount} NC → ${transaction.token_amount} USDT`)
          .order('created_at', { ascending: false })
          .limit(1);

        // Send notification
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Withdrawal Successful! 💰',
          message: `₦${fiat_amount} has been sent to your bank account. It should arrive shortly.`,
          metadata: { reference, fiat_amount, token_amount }
        });
      } else if (status === 'failed' || status === 'cancelled') {
        console.log(`[QUIDAX_WEBHOOK] Off-ramp failed: ${reference}`);

        // Refund user
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', transaction.user_id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              wallet_balance: profile.wallet_balance + transaction.fiat_amount,
              balance_withdrawable: profile.balance_withdrawable + transaction.fiat_amount
            })
            .eq('user_id', transaction.user_id);

          // Update wallet transaction
          await supabase
            .from('wallet_transactions')
            .update({ status: 'failed' })
            .eq('user_id', transaction.user_id)
            .eq('reference', `Quidax Off-Ramp: ${transaction.fiat_amount} NC → ${transaction.token_amount} USDT`)
            .order('created_at', { ascending: false })
            .limit(1);

          // Log refund
          await supabase.from('wallet_transactions').insert({
            user_id: transaction.user_id,
            kind: 'refund',
            amount: transaction.fiat_amount,
            status: 'completed',
            reference: `Quidax Off-Ramp Refund (Failed): ${reference}`
          });
        }

        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Withdrawal Failed',
          message: `Your withdrawal of ₦${transaction.fiat_amount} could not be completed. Funds have been refunded to your wallet.`,
          metadata: { reference, status }
        });
      }
    }

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
