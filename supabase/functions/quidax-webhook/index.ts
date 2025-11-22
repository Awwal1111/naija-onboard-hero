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
        // Extract amounts from correct webhook payload paths
        const cryptoAmount = parseFloat(webhookData.data?.crypto_payout?.amount || token_amount || '0');
        const fiatAmount = parseFloat(webhookData.data?.fiat_deposit?.amount || fiat_amount || '0');
        
        console.log(`[QUIDAX_WEBHOOK] Raw amounts from payload:`, {
          cryptoAmount,
          fiatAmount,
          fullPayload: webhookData.data
        });

        // Validate amounts
        if (fiatAmount <= 0 || cryptoAmount <= 0) {
          console.error('[QUIDAX_WEBHOOK] Invalid fiat or crypto amount:', { fiatAmount, cryptoAmount });
          throw new Error('Invalid fiat or crypto amount in Quidax payload');
        }

        // Calculate NC dynamically based on actual transaction rate
        const ncPerUSDT = fiatAmount / cryptoAmount;
        const ncAmount = Math.floor(cryptoAmount * ncPerUSDT);
        
        console.log(`[QUIDAX_WEBHOOK] NC Calculation:`, {
          cryptoAmount,
          fiatAmount,
          ncPerUSDT: ncPerUSDT.toFixed(2),
          ncAmount,
          userId: transaction.user_id
        });
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', transaction.user_id)
          .single();
        
        if (profileError) {
          console.error('[QUIDAX_WEBHOOK] Profile fetch error:', profileError);
          throw new Error('Failed to fetch user profile');
        }

        if (!profile) {
          console.error('[QUIDAX_WEBHOOK] Profile not found for user:', transaction.user_id);
          throw new Error('User profile not found');
        }

        const previousWallet = profile.wallet_balance || 0;
        const previousWithdrawable = profile.balance_withdrawable || 0;

        // Credit user balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            wallet_balance: previousWallet + ncAmount,
            balance_withdrawable: previousWithdrawable + ncAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id);
        
        if (updateError) {
          console.error('[QUIDAX_WEBHOOK] Balance update error:', updateError);
          throw new Error('Failed to update balance');
        }
        
        console.log(`[QUIDAX_WEBHOOK] Balance updated:`, {
          userId: transaction.user_id,
          previousWallet,
          newWallet: previousWallet + ncAmount,
          credited: ncAmount
        });
        
        // Log wallet transaction
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: transaction.user_id,
            amount: ncAmount,
            kind: 'quidax_deposit',
            description: `Quidax Ramp deposit: ${cryptoAmount.toFixed(4)} USDT (₦${fiatAmount.toFixed(2)})`,
            status: 'completed',
            reference: reference
          });
        
        if (txError) {
          console.error('[QUIDAX_WEBHOOK] Wallet transaction log error:', txError);
        }
        
        // Log crypto transaction
        const { error: cryptoError } = await supabase
          .from('crypto_transactions')
          .insert({
            user_id: transaction.user_id,
            transaction_type: 'deposit',
            crypto_amount: cryptoAmount,
            crypto_currency: 'USDT',
            naira_amount: fiatAmount,
            nc_amount: ncAmount,
            exchange_rate: ncPerUSDT,
            wallet_address: transaction.wallet_address || '',
            status: 'completed'
          });
        
        if (cryptoError) {
          console.error('[QUIDAX_WEBHOOK] Crypto transaction log error:', cryptoError);
        }
        
        console.log(`[QUIDAX_WEBHOOK] ✅ Successfully credited ${ncAmount} NC to user ${transaction.user_id}`);
      

        // Send notification
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'transaction',
          title: 'Deposit Successful! 🎉',
          message: `Your deposit of ₦${fiatAmount.toFixed(2)} (${cryptoAmount.toFixed(4)} USDT) has been credited. You received ${ncAmount} NC!`,
          metadata: { reference, fiat_amount: fiatAmount, crypto_amount: cryptoAmount, nc_amount: ncAmount }
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
