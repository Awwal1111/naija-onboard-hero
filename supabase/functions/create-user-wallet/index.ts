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

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[CREATE_WALLET] Supabase server configuration is incomplete");
      return json({ success: false, error: "Wallet service is not configured" }, 503);
    }
    // Fail closed. Never use a source-code/default encryption key.
    if (!encryptionSecret || encryptionSecret.length < 32) {
      console.error("[CREATE_WALLET] WALLET_ENCRYPTION_SECRET is missing or too short");
      return json({ success: false, error: "Wallet encryption is not configured securely" }, 503);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);

    // Generate candidate material. The database RPC serializes per-user requests
    // and decides whether to persist it or return the already-existing wallet.
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      wallet.privateKey,
      encryptionSecret,
    ).toString();

    const { data: provision, error: provisionError } = await supabase.rpc(
      "provision_celo_wallet",
      {
        p_user_id: user.id,
        p_wallet_address: wallet.address.toLowerCase(),
        p_encrypted_wallet: encryptedPrivateKey,
      },
    );

    if (provisionError) {
      console.error("[CREATE_WALLET] Atomic provisioning failed:", provisionError.message);
      return json({ success: false, error: "Could not safely provision wallet" }, 500);
    }

    if (provision?.status === "needs_recovery") {
      return json({
        success: false,
        code: "WALLET_KEY_RECOVERY_REQUIRED",
        address: provision.address,
        error: "An existing wallet address has no stored encrypted key. The address was preserved; manual recovery is required.",
      }, 409);
    }

    if (!["created", "exists"].includes(provision?.status) || !provision?.address) {
      console.error("[CREATE_WALLET] Unexpected RPC response");
      return json({ success: false, error: "Wallet provisioning returned an invalid result" }, 500);
    }

    if (provision.status === "created") {
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: "Your Celo Wallet is Ready!",
        message: `Your permanent Celo wallet address: ${provision.address}`,
        metadata: { wallet_address: provision.address },
      });
      // Notification failure must not undo or misreport a successfully stored wallet.
      if (notificationError) {
        console.error("[CREATE_WALLET] Wallet created, but notification failed:", notificationError.message);
      }
    }

    return json({
      success: true,
      address: provision.address,
      message: provision.status === "created" ? "Wallet created successfully" : "Wallet already exists",
    });
  } catch (error) {
    console.error("[CREATE_WALLET_ERROR]", error instanceof Error ? error.message : "Unknown error");
    return json({ success: false, error: "Wallet provisioning failed" }, 500);
  }
});
