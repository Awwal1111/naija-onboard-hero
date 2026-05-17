// Reloadly webhook: confirms async status updates for top-ups, gift cards, utilities.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const raw = await req.text();
    // Optional HMAC verification (Reloadly signs with the webhook secret)
    const signature = req.headers.get("x-signature") || req.headers.get("signature") || "";
    const secret = Deno.env.get("RELOADLY_WEBHOOK_SECRET") || "";
    if (secret && signature) {
      try {
        const key = await crypto.subtle.importKey(
          "raw", new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
        );
        const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
        const computed = Array.from(new Uint8Array(mac))
          .map(b => b.toString(16).padStart(2, "0")).join("");
        if (computed.toLowerCase() !== signature.toLowerCase()) {
          console.warn("[reloadly-webhook] signature mismatch");
        }
      } catch (e) {
        console.warn("[reloadly-webhook] signature check failed", e);
      }
    }

    const payload = raw ? JSON.parse(raw) : {};
    console.log("[reloadly-webhook]", payload?.eventType || payload?.type, payload?.transactionId);

    const customId = payload?.customIdentifier || payload?.data?.customIdentifier;
    const reloadlyId = String(payload?.transactionId || payload?.data?.transactionId || "");
    const status = String(payload?.status || payload?.data?.status || "").toUpperCase();

    if (customId) {
      const newStatus = status === "SUCCESSFUL" || status === "SUCCESS" ? "success"
        : status === "FAILED" || status === "ERROR" ? "failed" : "pending";
      await supabase.from("reloadly_transactions").update({
        status: newStatus,
        reloadly_transaction_id: reloadlyId || undefined,
        metadata: payload,
        updated_at: new Date().toISOString(),
      }).eq("id", customId);
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err: any) {
    console.error("[reloadly-webhook]", err?.message);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
