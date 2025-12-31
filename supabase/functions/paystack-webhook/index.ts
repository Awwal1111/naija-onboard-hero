import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

interface PaystackEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message?: string;
    gateway_response?: string;
    paid_at?: string;
    created_at?: string;
    channel: string;
    currency: string;
    ip_address?: string;
    customer: {
      id: number;
      first_name?: string;
      last_name?: string;
      email: string;
      phone?: string;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
    };
    metadata?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify Paystack signature
    const paystackSignature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    if (!paystackSignature) {
      console.error("Missing Paystack signature");
      return new Response("Unauthorized", { status: 401 });
    }

    // Verify the signature using your Paystack secret key
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      console.error("Paystack secret key not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const bodyData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, bodyData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (paystackSignature !== expectedSignature) {
      console.error("Invalid Paystack signature");
      return new Response("Unauthorized", { status: 401 });
    }

    const event: PaystackEvent = JSON.parse(body);
    console.log("Paystack webhook received:", event.event);

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(supabaseClient, event.data);
        break;
      case "charge.failed":
        await handleChargeFailed(supabaseClient, event.data);
        break;
      case "transfer.success":
        await handleTransferSuccess(supabaseClient, event.data);
        break;
      case "transfer.failed":
        await handleTransferFailed(supabaseClient, event.data);
        break;
      default:
        console.log("Unhandled event type:", event.event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in paystack-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function handleChargeSuccess(supabaseClient: any, data: any) {
  try {
    // Update transaction status
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .update({
        status: 'completed',
        metadata: data
      })
      .eq('reference', data.reference);

    if (transactionError) {
      console.error("Error updating transaction:", transactionError);
    }

    // Update user wallet balance
    if (data.metadata?.user_id) {
      // Update wallets table
      const { data: wallet, error: walletFetchError } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('user_id', data.metadata.user_id)
        .single();

      const amountInNaira = data.amount / 100;

      if (walletFetchError) {
        // Create wallet if it doesn't exist
        await supabaseClient
          .from('wallets')
          .insert({
            user_id: data.metadata.user_id,
            balance: amountInNaira,
            last_update: new Date().toISOString()
          });
      } else {
        // Update existing wallet
        await supabaseClient
          .from('wallets')
          .update({
            balance: wallet.balance + amountInNaira,
            last_update: new Date().toISOString()
          })
          .eq('user_id', data.metadata.user_id);
      }

      // Also update profiles table for backward compatibility
      await supabaseClient
        .from('profiles')
        .update({
          wallet_balance: supabaseClient.raw(`wallet_balance + ${amountInNaira}`)
        })
        .eq('user_id', data.metadata.user_id);

      // Create wallet transaction record
      await supabaseClient
        .from('wallet_transactions')
        .insert({
          user_id: data.metadata.user_id,
          amount: amountInNaira,
          transaction_type: 'credit',
          description: 'Deposit via Paystack',
          reference_id: data.reference,
          status: 'completed'
        });

      // Send email notification for deposit
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            userId: data.metadata.user_id,
            type: 'deposit',
            title: 'Deposit Successful! 💰',
            message: `Your deposit of ₦${amountInNaira.toLocaleString()} has been credited to your wallet.`,
            metadata: { 
              reference: data.reference, 
              transactionType: 'Deposit',
              amount: `₦${amountInNaira.toLocaleString()}`,
              status: 'Completed'
            },
            sendEmail: true,
            emailTemplate: 'transaction',
            attachPDF: true
          })
        });
        console.log("Email notification sent for deposit:", data.reference);
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
      }
    }

    console.log("Charge success processed for reference:", data.reference);
  } catch (error) {
    console.error("Error handling charge success:", error);
  }
}

async function handleChargeFailed(supabaseClient: any, data: any) {
  try {
    // Update transaction status
    const { error } = await supabaseClient
      .from('transactions')
      .update({
        status: 'failed',
        metadata: data
      })
      .eq('reference', data.reference);

    if (error) {
      console.error("Error updating failed transaction:", error);
    }

    console.log("Charge failed processed for reference:", data.reference);
  } catch (error) {
    console.error("Error handling charge failed:", error);
  }
}

async function handleTransferSuccess(supabaseClient: any, data: any) {
  try {
    // Update payout status
    const { error } = await supabaseClient
      .from('payouts')
      .update({
        status: 'completed'
      })
      .eq('paystack_transfer_ref', data.transfer_code);

    if (error) {
      console.error("Error updating payout:", error);
    }

    console.log("Transfer success processed for:", data.transfer_code);
  } catch (error) {
    console.error("Error handling transfer success:", error);
  }
}

async function handleTransferFailed(supabaseClient: any, data: any) {
  try {
    // Update payout status
    const { error } = await supabaseClient
      .from('payouts')
      .update({
        status: 'failed'
      })
      .eq('paystack_transfer_ref', data.transfer_code);

    if (error) {
      console.error("Error updating payout:", error);
    }

    console.log("Transfer failed processed for:", data.transfer_code);
  } catch (error) {
    console.error("Error handling transfer failed:", error);
  }
}