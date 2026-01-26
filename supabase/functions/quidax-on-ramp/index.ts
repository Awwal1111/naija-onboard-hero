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
        // GET /api/v1/merchants/payment_methods?currency=ngn&side=on_ramp
        console.log(`[QUIDAX_ON_RAMP] Fetching payment methods...`);
        
        const response = await fetch(
          `${QUIDAX_BASE_URL}/payment_methods?currency=ngn&side=on_ramp`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        
        console.log(`[QUIDAX_ON_RAMP] Payment methods response status: ${response.status}`);
        const data = await response.json();
        console.log(`[QUIDAX_ON_RAMP] Payment methods data:`, JSON.stringify(data, null, 2));
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_purchase_limits': {
        // GET /api/v1/merchants/purchase_limits/buy?currency_symbol=ngn
        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_limits/buy?currency_symbol=ngn`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'get_quote': {
        // GET /api/v1/merchants/purchase_quotes/buy?currency=ngn&token=usdt&fiat_amount=X&token_network=celo
        const { fiatAmount } = params;
        if (!fiatAmount || fiatAmount <= 0) {
          throw new Error("Invalid fiat amount");
        }

        const response = await fetch(
          `${QUIDAX_BASE_URL}/purchase_quotes/buy?currency=ngn&token=usdt&fiat_amount=${fiatAmount}&token_network=celo`,
          {
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
            }
          }
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'initiate_purchase': {
        // POST /api/v1/merchants/on_ramp_transactions/initiate (non-custodial)
        const { fiatAmount, paymentMethod, walletAddress } = params;

        if (!fiatAmount || !walletAddress) {
          throw new Error("Missing required parameters");
        }

        console.log(`[QUIDAX_ON_RAMP] ========== INITIATING PURCHASE ==========`);
        console.log(`[QUIDAX_ON_RAMP] Amount: ${fiatAmount} NGN → USDT`);
        console.log(`[QUIDAX_ON_RAMP] Wallet: ${walletAddress}`);

        // Get user profile for customer details
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        const requestBody = {
          from_currency: "ngn",
          to_currency: "usdt",
          from_amount: fiatAmount.toString(),
          merchant_reference: `NL_${Date.now()}_${user.id.slice(0, 8)}`,
          customer: {
            email: user.email || profile?.email || "user@naijalancers.name.ng",
            first_name: profile?.full_name?.split(' ')[0] || "User",
            last_name: profile?.full_name?.split(' ').slice(1).join(' ') || "NaijaLancers"
          },
          wallet_address: {
            address: walletAddress,
            network: "celo"
          }
        };
        
        console.log(`[QUIDAX_ON_RAMP] Request body:`, JSON.stringify(requestBody, null, 2));
        console.log(`[QUIDAX_ON_RAMP] Endpoint: ${QUIDAX_BASE_URL}/on_ramp_transactions/initiate`);

        const response = await fetch(
          `${QUIDAX_BASE_URL}/on_ramp_transactions/initiate`,
          {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY,
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
        if (data?.data?.reference) {
          await supabase.from('quidax_transactions').insert({
            user_id: user.id,
            transaction_type: 'on_ramp',
            reference: data.data.reference,
            fiat_amount: fiatAmount,
            fiat_currency: 'NGN',
            token: 'USDT',
            wallet_address: walletAddress,
            status: 'pending',
            quidax_data: data.data
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
              'accept': 'application/json',
              'x-private-key': QUIDAX_PRIVATE_KEY
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
