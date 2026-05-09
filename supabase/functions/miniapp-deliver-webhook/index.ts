// Generic mini-app webhook delivery (NC charges, payouts, etc.)
// Signs the payload with HMAC-SHA256 using the mini app's webhook_secret and
// POSTs to the registered webhook_url. Best-effort, with one immediate retry.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("No authorization");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const { miniAppId, event, data } = await req.json();
    if (!miniAppId || !event) throw new Error("miniAppId and event required");

    const { data: app } = await supabase
      .from("mini_apps")
      .select("id, app_name, webhook_url, webhook_secret")
      .eq("id", miniAppId)
      .maybeSingle();

    if (!app) throw new Error("Mini app not found");
    if (!app.webhook_url || !app.webhook_secret) {
      return new Response(JSON.stringify({ delivered: false, reason: "no_webhook_configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = {
      id: crypto.randomUUID(),
      event,
      mini_app_id: app.id,
      created_at: new Date().toISOString(),
      data: data || {},
    };
    const body = JSON.stringify(payload);
    const sig = await hmacSha256Hex(app.webhook_secret, body);

    let lastErr: string | null = null;
    let ok = false;
    let status = 0;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const res = await fetch(app.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Naijalancers-Signature": `sha256=${sig}`,
            "X-Naijalancers-Event": event,
            "X-Webhook-ID": payload.id,
            "User-Agent": "NaijaLancers-MiniApp-Webhook/1.0",
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        status = res.status;
        ok = res.ok;
        if (!ok) lastErr = `HTTP ${res.status}`;
      } catch (e: any) {
        lastErr = e?.message || "delivery failed";
      }
      if (!ok && attempt === 0) await new Promise(r => setTimeout(r, 750));
    }

    return new Response(JSON.stringify({ delivered: ok, status, error: ok ? null : lastErr, webhook_id: payload.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error("[miniapp-deliver-webhook]", e);
    return new Response(JSON.stringify({ delivered: false, error: e?.message || "Failed" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
