import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EscrowRequest {
  expert_id: string;
  job_id: string;
  amount: number;
  currency: string;
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

    const { expert_id, job_id, amount, currency }: EscrowRequest = await req.json();

    if (!expert_id || !job_id || !amount || amount <= 0) {
      throw new Error("Invalid escrow data");
    }

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate unique reference
    const reference = `escrow_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create escrow payment record
    const { data: escrow, error: escrowError } = await supabaseService
      .from('escrow_payments')
      .insert({
        client_id: user.id,
        expert_id,
        job_id,
        amount: amount / 100, // Convert from kobo to naira
        status: 'holding'
      })
      .select()
      .single();

    if (escrowError) {
      console.error("Escrow creation error:", escrowError);
      throw new Error("Failed to create escrow record");
    }

    // Create associated transaction
    const { data: transaction, error: transactionError } = await supabaseService
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'job_payment',
        amount,
        currency,
        status: 'pending',
        reference,
        metadata: {
          escrow_id: escrow.id,
          expert_id,
          job_id,
          user_email: user.email
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      throw new Error("Failed to create transaction");
    }

    // Initialize Paystack checkout
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amount, // Already in kobo
        reference,
        currency: currency.toUpperCase(),
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-callback`,
        metadata: {
          user_id: user.id,
          transaction_id: transaction.id,
          escrow_id: escrow.id,
          expert_id,
          job_id,
          transaction_type: 'job_payment'
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      throw new Error(paystackData.message || "Payment initialization failed");
    }

    console.log("Escrow payment created successfully:", {
      reference,
      escrow_id: escrow.id,
      client_id: user.id,
      expert_id,
      amount
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        checkout_url: paystackData.data.authorization_url,
        escrow_id: escrow.id,
        transaction_id: transaction.id
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
    console.error("Error in create-escrow:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create escrow payment"
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