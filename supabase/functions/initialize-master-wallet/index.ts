import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      throw new Error("Admin access required");
    }

    // Check if master wallet already exists
    const { data: existing } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "master_wallet_encrypted")
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          error: "Master wallet already exists. Contact support to reset.",
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate new master wallet
    console.log("[MASTER_WALLET] Generating new master wallet...");
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt private key
    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
    const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, encryptionSecret).toString();

    console.log("[MASTER_WALLET] Wallet generated:", address);

    // Store encrypted private key in system_settings
    const { error: insertError } = await supabase
      .from("system_settings")
      .insert({
        key: "master_wallet_encrypted",
        value: encryptedPrivateKey
      });

    if (insertError) {
      console.error("[MASTER_WALLET] Failed to store:", insertError);
      throw new Error("Failed to store master wallet");
    }

    // Also store the address for easy reference
    await supabase
      .from("system_settings")
      .insert({
        key: "master_wallet_address",
        value: address
      });

    console.log("[MASTER_WALLET] ✅ Master wallet created and stored");

    // Send notification to admin
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Master Wallet Created",
      message: `Your master wallet has been created. Address: ${address}. Please fund this wallet with CELO for gas fees.`
    });

    return new Response(
      JSON.stringify({
        success: true,
        address: address,
        message: "Master wallet created successfully. Please fund this address with CELO for gas fees (at least 0.1 CELO recommended)."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("[MASTER_WALLET_ERROR]", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
