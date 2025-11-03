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
        // GET /api/v1/merchants/purchase_quotes/buy?currency=NGN&token=USDT&fiat_amount=X&token_network=CELO
        const { fiatAmount } = params;
        if (!fiatAmount || fiatAmount <= 0) {
          throw new Error("Invalid fiat amount");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/buy?currency=NGN&token=USDT&fiat_amount=${fiatAmount}&token_network=CELO`,
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

        console.log(`[QUIDAX_ON_RAMP] ========== INITIATING PURCHASE ==========`);
        console.log(`[QUIDAX_ON_RAMP] Amount: ${fiatAmount} NGN → USDT`);
        console.log(`[QUIDAX_ON_RAMP] Wallet: ${walletAddress}`);
        console.log(`[QUIDAX_ON_RAMP] Payment Method: ${paymentMethod}`);

        const requestBody = {
          currency: "NGN",
          token: "USDT",
          token_network: "CELO",
          fiat_amount: fiatAmount,
          payment_method: paymentMethod,
          wallet_address: walletAddress,
          callback_url: `${SUPABASE_URL}/functions/v1/quidax-webhook`
        };
        
        console.log(`[QUIDAX_ON_RAMP] Request body:`, JSON.stringify(requestBody, null, 2));
        console.log(`[QUIDAX_ON_RAMP] Endpoint: ${QUIDAX_BASE_URL}/on_ramp_transaction`);

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

        console.log(`[QUIDAX_ON_RAMP] Response status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        console.log(`[QUIDAX_ON_RAMP] Raw response:`, responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log(`[QUIDAX_ON_RAMP] Parsed response:`, JSON.stringify(data, null, 2));
        } catch (e) {
          console.error(`[QUIDAX_ON_RAMP] Failed to parse response as JSON:`, e);
          throw new Error(`Quidax API returned invalid JSON: ${responseText}`);
        }

        if (!response.ok) {
          console.error(`[QUIDAX_ON_RAMP] ❌ Quidax API error:`, data);
          throw new Error(data?.message || data?.error || `Quidax API error: ${response.status}`);
        }

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
