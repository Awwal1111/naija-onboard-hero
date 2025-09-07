import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");
    
    if (!reference) {
      return new Response("Missing reference parameter", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify transaction with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackResponse.json();
    
    if (!paystackData.status) {
      throw new Error("Transaction verification failed");
    }

    const transaction = paystackData.data;
    console.log("Transaction verified:", transaction);

    // Update transaction in database
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        status: transaction.status === 'success' ? 'completed' : 'failed',
        metadata: transaction
      })
      .eq('reference', reference);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }

    // If successful, update user wallet
    if (transaction.status === 'success' && transaction.metadata?.user_id) {
      const amount = transaction.amount / 100; // Convert from kobo to naira

      // Update wallets table
      const { data: wallet, error: walletFetchError } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('user_id', transaction.metadata.user_id)
        .single();

      if (walletFetchError) {
        // Create wallet if it doesn't exist
        await supabaseClient
          .from('wallets')
          .insert({
            user_id: transaction.metadata.user_id,
            balance: amount,
            last_update: new Date().toISOString()
          });
      } else {
        // Update existing wallet
        await supabaseClient
          .from('wallets')
          .update({
            balance: wallet.balance + amount,
            last_update: new Date().toISOString()
          })
          .eq('user_id', transaction.metadata.user_id);
      }

      // Also update profiles table for backward compatibility
      await supabaseClient
        .from('profiles')
        .update({
          wallet_balance: supabaseClient.raw(`wallet_balance + ${amount}`)
        })
        .eq('user_id', transaction.metadata.user_id);

      // Create wallet transaction record
      await supabaseClient
        .from('wallet_transactions')
        .insert({
          user_id: transaction.metadata.user_id,
          amount: amount,
          transaction_type: 'credit',
          description: 'Deposit via Paystack',
          reference_id: reference,
          status: 'completed'
        });
    }

    // Redirect to success page with transaction status
    const redirectUrl = transaction.status === 'success'
      ? `${url.origin}/payment-success?reference=${reference}&amount=${transaction.amount / 100}`
      : `${url.origin}/payment-failed?reference=${reference}&reason=${transaction.gateway_response || 'Unknown error'}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in paystack-callback:", error);
    
    const url = new URL(req.url);
    const errorUrl = `${url.origin}/payment-failed?error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: errorUrl,
        ...corsHeaders,
      },
    });
  }
});