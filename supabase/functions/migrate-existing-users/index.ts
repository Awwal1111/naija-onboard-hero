import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET");
    if (!supabaseUrl || !serviceRoleKey) return json({ success: false, error: "Server configuration missing" }, 503);
    if (!encryptionSecret || encryptionSecret.length < 32) {
      return json({ success: false, error: "WALLET_ENCRYPTION_SECRET is missing or too short" }, 503);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // This function may use the service role key or a verified admin JWT only.
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!bearer) return json({ success: false, error: "Unauthorized" }, 401);
    if (bearer !== serviceRoleKey) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(bearer);
      if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);
      const { data: adminRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleError || !adminRole) return json({ success: false, error: "Admin access required" }, 403);
    }

    const [{ data: profiles, error: profilesError }, { data: secretRows, error: secretsError }, { data: walletRows, error: walletsError }] =
      await Promise.all([
        supabase.from("profiles").select("user_id, celo_wallet_address").limit(10000),
        supabase.from("user_secrets").select("user_id, encrypted_wallet").limit(10000),
        supabase.from("user_wallets").select("user_id").limit(10000),
      ]);
    if (profilesError) throw new Error(`Profile scan failed: ${profilesError.message}`);
    if (secretsError) throw new Error(`Encrypted-wallet scan failed: ${secretsError.message}`);
    if (walletsError) throw new Error(`Internal-wallet scan failed: ${walletsError.message}`);

    const encryptedByUser = new Set(
      (secretRows ?? []).filter((row: any) => typeof row.encrypted_wallet === "string" && row.encrypted_wallet.length > 0)
        .map((row: any) => row.user_id),
    );
    const hasInternalWallet = new Set((walletRows ?? []).map((row: any) => row.user_id));

    const results = {
      createdCeloWallets: [] as string[],
      existingCeloWalletsPreserved: 0,
      internalWalletRowsCreated: [] as string[],
      needsKeyRecovery: [] as { userId: string; address: string | null }[],
      failed: [] as { userId: string; error: string }[],
    };

    for (const profile of profiles ?? []) {
      const userId = profile.user_id as string;
      const address = profile.celo_wallet_address as string | null;
      const hasEncryptedKey = encryptedByUser.has(userId);

      try {
        // An address without its encrypted key is NOT a blank wallet. Never rotate it.
        if (address && !hasEncryptedKey) {
          results.needsKeyRecovery.push({ userId, address });
        } else if (address && hasEncryptedKey) {
          results.existingCeloWalletsPreserved += 1;
        } else {
          // New candidate material is committed atomically by the per-user RPC.
          const wallet = ethers.Wallet.createRandom();
          const encrypted = CryptoJS.AES.encrypt(wallet.privateKey, encryptionSecret).toString();
          const { data: provision, error: provisionError } = await supabase.rpc("provision_celo_wallet", {
            p_user_id: userId,
            p_wallet_address: wallet.address.toLowerCase(),
            p_encrypted_wallet: encrypted,
          });
          if (provisionError) throw new Error(`Atomic wallet provisioning failed: ${provisionError.message}`);
          if (provision?.status === "needs_recovery" || provision?.status === "orphaned_key") {
            results.needsKeyRecovery.push({ userId, address: provision.address ?? null });
          } else if (provision?.status === "created") {
            results.createdCeloWallets.push(userId);
            const { error: notificationError } = await supabase.from("notifications").insert({
              user_id: userId,
              type: "system",
              title: "Your Celo Wallet is Ready!",
              message: `Your permanent Celo wallet address: ${provision.address}`,
              metadata: { wallet_address: provision.address, migration: true },
            });
            if (notificationError) {
              console.error("[MIGRATION] Notification failed for", userId, notificationError.message);
            }
          } else if (provision?.status === "exists") {
            results.existingCeloWalletsPreserved += 1;
          } else {
            throw new Error("Unexpected wallet provisioning response");
          }
        }

        // Create only missing internal wallet rows. Never overwrite balances.
        if (!hasInternalWallet) {
          const { error: internalError } = await supabase.from("user_wallets").insert({
            user_id: userId,
            balance: 0,
            escrow_hold: 0,
          });
          if (internalError) throw new Error(`Internal wallet creation failed: ${internalError.message}`);
          results.internalWalletRowsCreated.push(userId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[MIGRATION] Failed user", userId, message);
        results.failed.push({ userId, error: message });
      }
    }

    return json({
      success: results.failed.length === 0,
      message: "Wallet reconciliation completed. Existing addresses were never replaced.",
      createdCeloWallets: results.createdCeloWallets.length,
      existingCeloWalletsPreserved: results.existingCeloWalletsPreserved,
      internalWalletRowsCreated: results.internalWalletRowsCreated.length,
      needsKeyRecovery: results.needsKeyRecovery,
      failedUsers: results.failed,
      scannedUsers: (profiles ?? []).length,
    });
  } catch (error) {
    console.error("[MIGRATION_ERROR]", error instanceof Error ? error.message : "Unknown error");
    return json({ success: false, error: error instanceof Error ? error.message : "Migration failed" }, 500);
  }
});
