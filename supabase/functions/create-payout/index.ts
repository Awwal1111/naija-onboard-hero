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

    // Check wallet balance from profiles table
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('balance_withdrawable, wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.balance_withdrawable < amount) {
      throw new Error(`Insufficient withdrawable balance. Available: ${profile.balance_withdrawable} NC`);
    }

    // Generate transfer reference
    const transferRef = `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create payout record
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

    // Debit wallet immediately (lock funds)
    const { error: walletUpdateError } = await supabaseService
      .from('profiles')
      .update({ 
        balance_withdrawable: profile.balance_withdrawable - amount,
        wallet_balance: profile.wallet_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (walletUpdateError) {
      console.error("Wallet update error:", walletUpdateError);
      // Rollback payout
      await supabaseService
        .from('payouts')
        .delete()
        .eq('id', payout.id);
      throw new Error("Failed to debit wallet");
    }

    // Create wallet transaction record
    await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        transaction_type: 'withdrawal_pending',
        description: `Withdrawal request pending admin approval`,
        reference: transferRef,
        status: 'pending'
      });

    // DO NOT initiate Paystack transfer here - admin will do it after approval

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