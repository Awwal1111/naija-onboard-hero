import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovePayoutRequest {
  payout_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { payout_id, action, rejection_reason }: ApprovePayoutRequest = await req.json();

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseService
      .from('payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (payoutError || !payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== 'pending') {
      throw new Error(`Payout already ${payout.status}`);
    }

    if (action === 'reject') {
      // Refund the user
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('balance_withdrawable, wallet_balance')
        .eq('user_id', payout.user_id)
        .single();

      if (profile) {
        await supabaseService
          .from('profiles')
          .update({ 
            balance_withdrawable: profile.balance_withdrawable + payout.amount,
            wallet_balance: profile.wallet_balance + payout.amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payout.user_id);
      }

      // Update payout status
      await supabaseService
        .from('payouts')
        .update({ 
          status: 'rejected',
          admin_notes: rejection_reason || 'Rejected by admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', payout_id);

      // Log transaction
      await supabaseService
        .from('wallet_transactions')
        .insert({
          user_id: payout.user_id,
          amount: payout.amount,
          transaction_type: 'withdrawal_rejected',
          description: `Withdrawal rejected: ${rejection_reason || 'No reason provided'}`,
          reference: payout.paystack_transfer_ref,
          status: 'completed'
        });

      return new Response(
        JSON.stringify({ success: true, message: "Payout rejected and funds refunded" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Approve and process with Paystack
    if (payout.method === 'bank' && payout.bank_details) {
      const bankDetails = payout.bank_details as any;

      // Create Paystack transfer recipient
      const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: bankDetails.account_name,
          account_number: bankDetails.account_number,
          bank_code: bankDetails.bank_code,
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
          amount: payout.amount * 100, // Convert to kobo
          recipient: recipientData.data.recipient_code,
          reason: "Wallet withdrawal - Admin approved",
          reference: payout.paystack_transfer_ref
        }),
      });

      const transferData = await transferResponse.json();

      if (!transferData.status) {
        console.error("Paystack transfer failed:", transferData);
        throw new Error("Transfer initialization failed");
      }

      console.log("Transfer initiated:", transferData.data);
    }

    // Update payout status to approved/processing
    await supabaseService
      .from('payouts')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', payout_id);

    // Update wallet transaction
    await supabaseService
      .from('wallet_transactions')
      .update({
        status: 'completed',
        transaction_type: 'withdrawal_approved',
        description: 'Withdrawal approved by admin - Processing payment'
      })
      .eq('reference', payout.paystack_transfer_ref)
      .eq('user_id', payout.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payout approved and sent to Paystack for processing" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in approve-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process payout" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
