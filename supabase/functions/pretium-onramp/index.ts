import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PRETIUM_BASE = "https://api.xwift.africa";
const SUPPORTED = new Set(["KES", "GHS", "UGX", "MWK", "CDF"]);
const DIAL: Record<string, string> = { KES: "254", GHS: "233", UGX: "256", MWK: "265", CDF: "243" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const internationalNumber = (input: unknown, currency: string) => {
  let number = String(input || "").replace(/[^\d]/g, "");
  const dial = DIAL[currency];
  if (number.startsWith(`00${dial}`)) number = number.slice(2);
  if (number.startsWith("0")) number = number.slice(1);
  return number.startsWith(dial) ? number : `${dial}${number}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in to make a deposit" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pretiumKey = Deno.env.get("PRETIUM_CONSUMER_KEY")?.trim();
    if (!url || !anonKey || !serviceKey) return json({ error: "Deposit service configuration is incomplete" }, 503);
    if (!pretiumKey) return json({ error: "Mobile-money provider is not configured" }, 503);

    const authClient = createClient(url, anonKey);
    const admin = createClient(url, serviceKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Your session expired. Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const currency = String(body.currency || "").toUpperCase();
    const network = String(body.mobile_network || "").trim();
    const amount = Number(body.amount);
    if (!SUPPORTED.has(currency)) return json({ error: "This currency is not supported" }, 400);
    if (!network || !Number.isFinite(amount) || amount <= 0) return json({ error: "Enter a valid network and amount" }, 400);
    const shortcode = internationalNumber(body.shortcode, currency);
    if (shortcode.length < 11 || shortcode.length > 15) return json({ error: "Enter a valid mobile-money number" }, 400);

    const pretium = async (path: string, payload: Record<string, unknown>) => {
      const response = await fetch(`${PRETIUM_BASE}${path}`, {
        method: "POST",
        headers: { "x-api-key": pretiumKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* retain provider text */ }
      return { response, data, raw };
    };

    const { data: profile } = await admin.from("profiles").select("celo_wallet_address").eq("user_id", user.id).maybeSingle();
    let address = profile?.celo_wallet_address;
    if (!address) {
      const walletResponse = await fetch(`${url}/functions/v1/create-user-wallet`, {
        method: "POST",
        headers: { Authorization: authHeader, apikey: anonKey, "Content-Type": "application/json" },
      });
      const wallet = await walletResponse.json().catch(() => ({}));
      if (!walletResponse.ok || !wallet?.address) {
        console.error("[PRETIUM-ONRAMP] wallet provisioning failed", walletResponse.status, wallet?.error);
        return json({ error: wallet?.error || "Your deposit wallet could not be prepared" }, 502);
      }
      address = wallet.address;
    }

    const reference = crypto.randomUUID();
    const callbackUrl = `${url}/functions/v1/pretium-webhook?ref=${reference}`;
    const result = await pretium(`/v1/onramp/${currency}`, {
      shortcode,
      amount,
      mobile_network: network,
      chain: "CELO",
      asset: "USDT",
      address,
      callback_url: callbackUrl,
      reference,
    });

    if (!result.response.ok || Number(result.data?.code || 0) >= 400) {
      const providerMessage = result.data?.message || result.data?.error || result.raw || "Deposit request failed";
      console.error("[PRETIUM-ONRAMP] provider failure", result.response.status, providerMessage.slice(0, 500));
      return json({ success: false, error: providerMessage, status: result.response.status }, 502);
    }

    const transactionCode = result.data?.data?.transaction_code || null;
    const { error: insertError } = await admin.from("pretium_transactions").insert({
      user_id: user.id,
      reference,
      transaction_code: transactionCode,
      type: "onramp",
      currency,
      fiat_amount: amount,
      asset: "USDT",
      chain: "CELO",
      status: "pending",
      recipient_address: address,
      metadata: { shortcode, mobile_network: network },
    });
    if (insertError) console.error("[PRETIUM-ONRAMP] transaction record failed", insertError.message);

    return json({
      success: true,
      reference,
      transaction_code: transactionCode,
      message: result.data?.data?.message || "Prompt sent. Approve it on your phone to complete the deposit.",
    });
  } catch (error) {
    console.error("[PRETIUM-ONRAMP] unexpected failure", error instanceof Error ? error.message : error);
    return json({ error: "Deposit service is temporarily unavailable" }, 500);
  }
});