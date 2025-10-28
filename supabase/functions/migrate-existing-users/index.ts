import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import * as CryptoJS from "https://cdn.skypack.dev/crypto-js@4.1.1";

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

    // Admin authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
    }

    console.log('[MIGRATION] Starting wallet migration for existing users...');

    // Find users without encrypted wallets (includes both null wallet addresses AND users with old addresses but no encryption)
    const { data: usersWithoutWallets, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, full_name, celo_wallet_address, encrypted_wallet')
      .or('celo_wallet_address.is.null,encrypted_wallet.is.null');

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!usersWithoutWallets || usersWithoutWallets.length === 0) {
      console.log('[MIGRATION] ✅ All users already have wallets!');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All users already have wallets',
          migrated: 0,
          total: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MIGRATION] Found ${usersWithoutWallets.length} users without wallets`);

    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
    const results = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[]
    };

    // Create wallets for each user
    for (const userProfile of usersWithoutWallets) {
      try {
        console.log(`[MIGRATION] Processing user: ${userProfile.user_id} (existing wallet: ${userProfile.celo_wallet_address || 'none'})`);

        // Create new wallet
        const wallet = ethers.Wallet.createRandom();
        
        // Encrypt private key
        const encryptedPrivateKey = CryptoJS.AES.encrypt(
          wallet.privateKey,
          encryptionSecret
        ).toString();

        // Determine notification message
        const notificationMsg = userProfile.celo_wallet_address 
          ? `⚠️ IMPORTANT: Your wallet address has been updated!\n\nOLD ADDRESS (no longer use): ${userProfile.celo_wallet_address}\n\nNEW ADDRESS: ${wallet.address}\n\nPlease use ONLY the new address for all future deposits. The old address will not work for sweeps.`
          : `We've created a permanent wallet for you!\n\nYour Address: ${wallet.address}\n\nYou can now receive crypto deposits at this address. All deposits will be automatically converted to NC (Naira Credits).\n\nThis wallet address is permanent and will work across all your devices.`;

        // Save to database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            celo_wallet_address: wallet.address.toLowerCase(),
            encrypted_wallet: encryptedPrivateKey
          })
          .eq('user_id', userProfile.user_id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: userProfile.user_id,
          type: 'system',
          title: userProfile.celo_wallet_address ? '⚠️ Wallet Address Updated' : '🎉 Your Permanent Celo Wallet is Ready!',
          message: notificationMsg,
          metadata: {
            wallet_address: wallet.address,
            old_wallet_address: userProfile.celo_wallet_address,
            migration: true
          }
        });

        results.success.push(userProfile.user_id);
        console.log(`[MIGRATION] ✅ Wallet created for user ${userProfile.user_id}: ${wallet.address}`);

      } catch (error: any) {
        console.error(`[MIGRATION] ❌ Failed for user ${userProfile.user_id}:`, error);
        results.failed.push({
          userId: userProfile.user_id,
          error: error.message
        });
      }
    }

    const summary = {
      success: true,
      message: `Migration completed: ${results.success.length} successful, ${results.failed.length} failed`,
      migrated: results.success.length,
      total: usersWithoutWallets.length,
      successfulUsers: results.success,
      failedUsers: results.failed
    };

    console.log('[MIGRATION] Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MIGRATION_ERROR]', error);
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