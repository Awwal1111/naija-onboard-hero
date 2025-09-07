import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutRequest {
  amount: number;
  method: 'bank' | 'airtime';
  bank_details?: {
    account_number: string;
    bank_code: string;
    account_name: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { amount, method, bank_details }: PayoutRequest = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid payout amount");
    }

    // Use service role for wallet operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseService
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }

    // Generate transfer reference
    const transferRef = `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create payout record and debit wallet in a transaction
    const { data: payout, error: payoutError } = await supabaseService
      .from('payouts')
      .insert({
        user_id: user.id,
        amount,
        method,
        status: 'pending',
        bank_details: method === 'bank' ? bank_details : null,
        paystack_transfer_ref: transferRef
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Payout creation error:", payoutError);
      throw new Error("Failed to create payout record");
    }

    // Debit wallet immediately
    const { error: walletUpdateError } = await supabaseService
      .from('wallets')
      .update({ 
        balance: wallet.balance - amount,
        last_update: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (walletUpdateError) {
      console.error("Wallet update error:", walletUpdateError);
      throw new Error("Failed to debit wallet");
    }

    // Create wallet transaction record
    await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount, // Negative for debit
        transaction_type: 'debit',
        description: `Withdrawal via ${method}`,
        reference_id: transferRef,
        status: 'pending'
      });

    if (method === 'bank' && bank_details) {
      // Create Paystack transfer recipient
      const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: bank_details.account_name,
          account_number: bank_details.account_number,
          bank_code: bank_details.bank_code,
          currency: "NGN"
        }),
      });

      const recipientData = await recipientResponse.json();

      if (!recipientData.status) {
        console.error("Paystack recipient creation failed:", recipientData);
        throw new Error("Failed to create transfer recipient");
      }

      // Initiate transfer
      const transferResponse = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: amount * 100, // Convert to kobo
          recipient: recipientData.data.recipient_code,
          reason: "Wallet withdrawal",
          reference: transferRef
        }),
      });

      const transferData = await transferResponse.json();

      if (!transferData.status) {
        console.error("Paystack transfer failed:", transferData);
        
        // Refund wallet on transfer failure
        await supabaseService
          .from('wallets')
          .update({ 
            balance: wallet.balance // Restore original balance
          })
          .eq('user_id', user.id);

        await supabaseService
          .from('payouts')
          .update({ status: 'failed' })
          .eq('id', payout.id);

        throw new Error("Transfer initialization failed");
      }

      console.log("Transfer initiated:", transferData.data);
    }

    console.log("Payout created successfully:", {
      payout_id: payout.id,
      user_id: user.id,
      amount,
      method
    });

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        message: "Payout request created successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-payout:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create payout"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});