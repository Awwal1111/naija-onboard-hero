import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

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

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[CREATE_WALLET] Creating wallet for user: ${user.id}`);

    // Check if user already has a wallet
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('celo_wallet_address, encrypted_wallet')
      .eq('user_id', user.id)
      .single();

    if (existingProfile?.celo_wallet_address && existingProfile?.encrypted_wallet) {
      console.log(`[CREATE_WALLET] User already has wallet: ${existingProfile.celo_wallet_address}`);
      return new Response(
        JSON.stringify({
          success: true,
          address: existingProfile.celo_wallet_address,
          message: 'Wallet already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new wallet
    const wallet = ethers.Wallet.createRandom();
    console.log(`[CREATE_WALLET] Generated new wallet: ${wallet.address}`);

    // Encrypt private key with server secret
    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      wallet.privateKey,
      encryptionSecret
    ).toString();

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        celo_wallet_address: wallet.address.toLowerCase(),
        encrypted_wallet: encryptedPrivateKey
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[CREATE_WALLET] Error saving wallet:', updateError);
      throw new Error('Failed to save wallet to database');
    }

    console.log(`[CREATE_WALLET] ✅ Wallet saved to database for user ${user.id}`);

    // Send notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: 'Your Celo Wallet is Ready! 🎉',
      message: `Your permanent wallet address: ${wallet.address}\n\nYou can now receive crypto deposits at this address. All deposits will be automatically converted to NC (Naira Credits).`,
      metadata: {
        wallet_address: wallet.address
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        address: wallet.address,
        message: 'Wallet created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CREATE_WALLET_ERROR]', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});