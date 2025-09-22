import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionRequest {
  type: 'deposit' | 'job_payment' | 'subscription';
  amount: number;
  currency: string;
  metadata?: any;
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

    const { type, amount, currency, metadata }: TransactionRequest = await req.json();

    if (!type || !amount || amount <= 0) {
      throw new Error("Invalid transaction data");
    }

    // Generate unique reference
    const reference = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create transaction record using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: transaction, error: transactionError } = await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        transaction_type: type,
        amount,
        status: 'pending',
        reference_id: reference,
        description: `${type} - ${amount} ${currency}`
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
          transaction_type: type,
          ...metadata
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      throw new Error(paystackData.message || "Payment initialization failed");
    }

    console.log("Transaction created successfully:", {
      reference,
      user_id: user.id,
      amount,
      type
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        checkout_url: paystackData.data.authorization_url,
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
    console.error("Error in create-transaction:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create transaction"
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