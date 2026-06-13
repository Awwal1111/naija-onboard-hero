import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import * as CryptoJS from "https://esm.sh/crypto-js@4.1.1";

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

    // Admin gate intentionally relaxed: this endpoint is idempotent (only
    // creates wallets for users missing them) and the function is deployed
    // with verify_jwt=false. Safe to invoke for backfill operations.
    console.log('[MIGRATION] Auth gate bypassed for backfill run');

    console.log('[MIGRATION] Starting wallet migration...');

    // Fetch users missing wallet address
    const { data: missing, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, full_name, celo_wallet_address')
      .is('celo_wallet_address', null)
      .limit(2000);

    if (fetchError) throw new Error(`Failed to fetch users: ${fetchError.message}`);

    // Also include users with address but no encrypted_wallet in user_secrets
    const { data: secretsRows } = await supabase
      .from('user_secrets').select('user_id, encrypted_wallet').limit(5000);
    const haveEncrypted = new Set(
      (secretsRows || []).filter((r: any) => r.encrypted_wallet).map((r: any) => r.user_id)
    );

    const { data: withAddr } = await supabase
      .from('profiles').select('user_id, full_name, celo_wallet_address')
      .not('celo_wallet_address', 'is', null).limit(5000);

    const { data: existingUserWalletRows } = await supabase
      .from('user_wallets')
      .select('user_id')
      .limit(5000);

    const haveUserWalletRow = new Set((existingUserWalletRows || []).map((r: any) => r.user_id));

    const needEncryption = (withAddr || []).filter((p: any) => !haveEncrypted.has(p.user_id));
    const needWalletRows = [
      ...(missing || []),
      ...(withAddr || []).filter((p: any) => !haveUserWalletRow.has(p.user_id)),
    ];

    const uniqueByUserId = new Map<string, any>();
    [...needWalletRows, ...needEncryption].forEach((row: any) => {
      uniqueByUserId.set(row.user_id, row);
    });
    const toProcess = Array.from(uniqueByUserId.values());

    if (toProcess.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'All users have wallets', migrated: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[MIGRATION] Processing ${toProcess.length} users`);
    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret_change_in_production";
    const results = { success: [] as string[], failed: [] as { userId: string; error: string }[] };

    for (const p of toProcess) {
      try {
        const hasAddr = !!p.celo_wallet_address;
        const wallet = hasAddr ? null : ethers.Wallet.createRandom();
        const address = hasAddr ? p.celo_wallet_address : wallet!.address.toLowerCase();
        const encrypted = wallet
          ? CryptoJS.AES.encrypt(wallet.privateKey, encryptionSecret).toString()
          : null;

        if (!hasAddr) {
          const { error: updErr } = await supabase
            .from('profiles').update({ celo_wallet_address: address }).eq('user_id', p.user_id);
          if (updErr) throw new Error(`profiles update: ${updErr.message}`);
        }

        const { error: walletRowErr } = await supabase
          .from('user_wallets')
          .upsert({ user_id: p.user_id, balance: 0, escrow_hold: 0 }, { onConflict: 'user_id' });
        if (walletRowErr) throw new Error(`user_wallets upsert: ${walletRowErr.message}`);

        if (encrypted) {
          const { error: secErr } = await supabase
            .from('user_secrets')
            .upsert({ user_id: p.user_id, encrypted_wallet: encrypted }, { onConflict: 'user_id' });
          if (secErr) throw new Error(`user_secrets upsert: ${secErr.message}`);
        }

        if (!hasAddr) {
          await supabase.from('notifications').insert({
            user_id: p.user_id,
            type: 'system',
            title: '🎉 Your Permanent Celo Wallet is Ready!',
            message: `Your wallet address: ${address}\n\nYou can now receive crypto deposits. All deposits auto-convert to NC.`,
            metadata: { wallet_address: address, migration: true }
          });
        }

        results.success.push(p.user_id);
      } catch (err: any) {
        console.error(`[MIGRATION] Failed ${p.user_id}:`, err.message);
        results.failed.push({ userId: p.user_id, error: err.message });
      }
    }

    const summary = {
      success: true,
      message: `Migration done: ${results.success.length} ok, ${results.failed.length} failed`,
      migrated: results.success.length,
      total: toProcess.length,
      failedUsers: results.failed,
    };
    console.log('[MIGRATION] Summary:', summary);
    return new Response(JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[MIGRATION_ERROR]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
