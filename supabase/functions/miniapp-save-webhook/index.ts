import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  appId: z.string().uuid(),
  webhookUrl: z.string().trim().optional().nullable(),
  rotateSecret: z.boolean().optional().default(false),
});

const createSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appId, webhookUrl, rotateSecret } = parsed.data;
    const normalizedUrl = webhookUrl?.trim() ? webhookUrl.trim() : null;
    if (normalizedUrl && !/^https:\/\//i.test(normalizedUrl)) {
      return new Response(JSON.stringify({ error: "Webhook URL must start with https://" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: app, error: appError } = await service
      .from("mini_apps")
      .select("id, developer_id, webhook_url, webhook_secret")
      .eq("id", appId)
      .maybeSingle();

    if (appError) throw appError;
    if (!app || app.developer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Mini app not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, string | null> = { webhook_url: normalizedUrl };
    if (rotateSecret || !app.webhook_secret) {
      updates.webhook_secret = createSecret();
    }

    const { data: updated, error: updateError } = await service
      .from("mini_apps")
      .update(updates)
      .eq("id", appId)
      .select("id, webhook_url, webhook_secret")
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      webhook_url: updated.webhook_url,
      webhook_secret: updated.webhook_secret,
      rotated: Boolean(rotateSecret),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[miniapp-save-webhook]", error);
    return new Response(JSON.stringify({ error: error?.message || "Failed to save webhook settings" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});