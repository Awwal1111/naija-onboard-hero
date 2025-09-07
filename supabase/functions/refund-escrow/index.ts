import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundEscrowRequest {
  escrow_id: string;
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

    const { escrow_id }: RefundEscrowRequest = await req.json();

    if (!escrow_id) {
      throw new Error("Escrow ID is required");
    }

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get escrow details and verify ownership or admin status
    const { data: escrow, error: escrowError } = await supabaseService
      .from('escrow_payments')
      .select('*')
      .eq('id', escrow_id)
      .single();

    if (escrowError || !escrow) {
      throw new Error("Escrow payment not found");
    }

    // Check if user is client or expert (both can request refund for disputes)
    if (escrow.client_id !== user.id && escrow.expert_id !== user.id) {
      throw new Error("Unauthorized to refund this escrow");
    }

    if (escrow.status !== 'holding') {
      throw new Error("Escrow payment is not in holding status");
    }

    // Update escrow status to refunded
    const { error: updateError } = await supabaseService
      .from('escrow_payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString()
      })
      .eq('id', escrow_id);

    if (updateError) {
      console.error("Error updating escrow:", updateError);
      throw new Error("Failed to refund escrow payment");
    }

    // Add funds back to client's wallet
    const { data: clientWallet, error: walletFetchError } = await supabaseService
      .from('wallets')
      .select('balance')
      .eq('user_id', escrow.client_id)
      .single();

    if (walletFetchError) {
      // Create wallet if it doesn't exist
      await supabaseService
        .from('wallets')
        .insert({
          user_id: escrow.client_id,
          balance: escrow.amount
        });
    } else {
      // Update existing wallet
      await supabaseService
        .from('wallets')
        .update({
          balance: clientWallet.balance + escrow.amount,
          last_update: new Date().toISOString()
        })
        .eq('user_id', escrow.client_id);
    }

    // Also update profiles table for backward compatibility
    await supabaseService
      .from('profiles')
      .update({
        wallet_balance: supabaseService.raw(`wallet_balance + ${escrow.amount}`)
      })
      .eq('user_id', escrow.client_id);

    // Create wallet transaction for client
    await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: escrow.client_id,
        amount: escrow.amount,
        transaction_type: 'credit',
        description: `Escrow payment refunded - Job ${escrow.job_id}`,
        reference_id: escrow_id,
        status: 'completed'
      });

    console.log("Escrow refunded successfully:", {
      escrow_id,
      client_id: escrow.client_id,
      amount: escrow.amount
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Escrow payment refunded successfully",
        amount_refunded: escrow.amount,
        client_id: escrow.client_id
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
    console.error("Error in refund-escrow:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to refund escrow payment"
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