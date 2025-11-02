import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QUIDAX_PUBLIC_KEY = Deno.env.get("QUIDAX_PUBLIC_KEY")!;
const QUIDAX_PRIVATE_KEY = Deno.env.get("QUIDAX_PRIVATE_KEY")!;
const QUIDAX_BASE_URL = "https://ramp-be.quidax.io/api/v1/merchants";

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, ...params } = await req.json();
    console.log(`[QUIDAX_ON_RAMP] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case 'get_payment_methods': {
        // GET /api/v1/merchants/payment_methods?currency=NGN&side=buy
        const response = await fetch(
          `${QUIDAX_BASE_URL}/payment_methods?currency=NGN&side=buy`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_purchase_limits': {
        // GET /api/v1/merchants/purchase_limits/buy?currency_symbol=NGN
        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_limits/buy?currency_symbol=NGN`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_quote': {
        // GET /api/v1/merchants/purchase_quotes/buy?currency=NGN&token=USDT&fiat_amount=X&token_network=BEP20
        const { fiatAmount } = params;
        if (!fiatAmount || fiatAmount <= 0) {
          throw new Error("Invalid fiat amount");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/buy?currency=NGN&token=USDT&fiat_amount=${fiatAmount}&token_network=BEP20`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'initiate_purchase': {
        // POST /api/v1/merchants/on_ramp_transaction
        const { fiatAmount, paymentMethod, walletAddress } = params;

        if (!fiatAmount || !paymentMethod || !walletAddress) {
          throw new Error("Missing required parameters");
        }

        console.log(`[QUIDAX_ON_RAMP] Initiating purchase: ${fiatAmount} NGN → USDT to ${walletAddress}`);

        const requestBody = {
          currency: "NGN",
          token: "USDT",
          token_network: "BEP20",
          fiat_amount: fiatAmount,
          payment_method: paymentMethod,
          wallet_address: walletAddress,
          callback_url: `${SUPABASE_URL}/functions/v1/quidax-webhook`
        };

        const response = await fetch(
          `${QUIDAX_BASE_URL}/on_ramp_transaction`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${QUIDAX_PRIVATE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          }
        );

        const data = await response.json();
        console.log(`[QUIDAX_ON_RAMP] Response:`, data);

        // Store transaction reference
        if (data.reference) {
          await supabase.from('quidax_transactions').insert({
            user_id: user.id,
            transaction_type: 'on_ramp',
            reference: data.reference,
            fiat_amount: fiatAmount,
            fiat_currency: 'NGN',
            token: 'USDT',
            wallet_address: walletAddress,
            status: 'pending',
            quidax_data: data
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_transaction_status': {
        // GET /api/v1/merchants/on_ramp_transaction/{reference}
        const { reference } = params;
        if (!reference) {
          throw new Error("Missing reference");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/on_ramp_transaction/${reference}`,
          {
            headers: {
              'Authorization': `Bearer ${QUIDAX_PUBLIC_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Quidax On-Ramp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
