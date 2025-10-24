import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("CELO_MASTER_WALLET_PRIVATE_KEY");
    
    if (!privateKey) {
      throw new Error("Master wallet private key not configured");
    }

    // Derive the wallet address from private key
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;

    console.log('[MASTER_WALLET] Address derived:', address);

    return new Response(
      JSON.stringify({ 
        address,
        success: true 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error: any) {
    console.error('[MASTER_WALLET_ERROR]', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
