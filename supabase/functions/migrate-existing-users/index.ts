import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encryptionSecret = Deno.env.get("WALLET_ENCRYPTION_SECRET");
    if (!supabaseUrl || !serviceRoleKey) return json({ success: false, error: "Server configuration missing" }, 503);
    if (!encryptionSecret || encryptionSecret.length < 32) {
      return json({ success: false, error: "Wallet encryption is not configured securely" }, 503);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (roleError || !roleRow) return json({ success: false, error: "Super-admin access required" }, 403);

    const summary = { scanned: 0, createdCeloWallets: 0, existingCeloWalletsPreserved: 0, needsKeyRecovery: 0, internalWalletRowsCreated: 0, failed: 0 };
    const pageSize = 400;

    for (let offset = 0; ; offset += pageSize) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles").select("user_id,celo_wallet_address").order("user_id").range(offset, offset + pageSize - 1);
      if (profilesError) throw new Error("Profile scan failed: " + profilesError.message);
      if (!profiles?.length) break;

      const ids = profiles.map((profile: any) => profile.user_id);
      const [{ data: secrets, error: secretsError }, { data: wallets, error: walletsError }] = await Promise.all([
        supabase.from("user_secrets").select("user_id,encrypted_wallet").in("user_id", ids),
        supabase.from("user_wallets").select("user_id").in("user_id", ids),
      ]);
      if (secretsError) throw new Error("Encrypted-wallet scan failed: " + secretsError.message);
      if (walletsError) throw new Error("Internal-wallet scan failed: " + walletsError.message);

      const keys = new Set((secrets ?? []).filter((row: any) => typeof row.encrypted_wallet === "string" && row.encrypted_wallet.trim().length > 0).map((row: any) => row.user_id));
      const internal = new Set((wallets ?? []).map((row: any) => row.user_id));

      for (let i = 0; i < profiles.length; i += 20) {
        const group = profiles.slice(i, i + 20);
        await Promise.all(group.map(async (profile: any) => {
          summary.scanned++;
          const userId = profile.user_id as string;
          const address = typeof profile.celo_wallet_address === "string" ? profile.celo_wallet_address.trim() : "";
          const hasKey = keys.has(userId);
          try {
            if (address && hasKey) {
              summary.existingCeloWalletsPreserved++;
            } else if (address && !hasKey) {
              summary.needsKeyRecovery++;
            } else {
              const wallet = ethers.Wallet.createRandom();
              const encrypted = CryptoJS.AES.encrypt(wallet.privateKey, encryptionSecret).toString();
              const { data: provision, error } = await supabase.rpc("provision_celo_wallet", {
                p_user_id: userId, p_wallet_address: wallet.address.toLowerCase(), p_encrypted_wallet: encrypted,
              });
              if (error) throw new Error("Atomic provisioning failed: " + error.message);
              if (provision?.status === "created") summary.createdCeloWallets++;
              else if (provision?.status === "exists") summary.existingCeloWalletsPreserved++;
              else if (provision?.status === "needs_recovery" || provision?.status === "orphaned_key") summary.needsKeyRecovery++;
              else throw new Error("Unexpected wallet provisioning result");
            }

            if (!internal.has(userId)) {
              const { error: insertError } = await supabase.from("user_wallets")
                .upsert({ user_id: userId, balance: 0, escrow_hold: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
              if (insertError) throw new Error("Internal wallet insert failed: " + insertError.message);
              summary.internalWalletRowsCreated++;
            }
          } catch (error) {
            summary.failed++;
            console.error("[MIGRATION] User wallet reconciliation failed", userId, error instanceof Error ? error.message : "Unknown error");
          }
        }));
      }
      if (profiles.length < pageSize) break;
    }

    return json({ success: summary.failed === 0, message: "Wallet reconciliation finished; existing addresses, encrypted keys, balances and escrow values were preserved.", ...summary });
  } catch (error) {
    console.error("[MIGRATION_ERROR]", error instanceof Error ? error.message : "Unknown error");
    return json({ success: false, error: "Wallet reconciliation failed" }, 500);
  }
});