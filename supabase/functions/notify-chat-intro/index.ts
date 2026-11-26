import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { intro_id, event } = await req.json() as { intro_id: string; event: "created" | "accepted" };
    if (!intro_id || !["created", "accepted"].includes(event)) {
      return new Response(JSON.stringify({ success: false, error: "intro_id and a valid event are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intro, error: introError } = await supabase
      .from("chat_intro_requests")
      .select("id, sender_id, recipient_id, message, status")
      .eq("id", intro_id)
      .single();

    if (introError || !intro) {
      return new Response(JSON.stringify({ success: false, error: "Introduction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorId = authData.user.id;
    let targetUserId: string;
    let type: string;
    let title: string;
    let message: string;

    if (event === "created") {
      if (intro.sender_id !== actorId || intro.status !== "pending") {
        return new Response(JSON.stringify({ success: false, error: "Not authorized to notify this introduction" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = intro.recipient_id;
      type = "intro_request";
      title = "New introduction request";
      message = "Someone has sent you a chat introduction request. Open NaijaLancers to review it.";
    } else {
      if (intro.recipient_id !== actorId || intro.status !== "accepted") {
        return new Response(JSON.stringify({ success: false, error: "Not authorized to notify this introduction" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = intro.sender_id;
      type = "intro_accepted";
      title = "Introduction accepted";
      message = "Your chat introduction was accepted. You can now start chatting on NaijaLancers.";
    }

    const { data: notificationResult, error: notificationError } = await supabase.functions.invoke("smart-notification", {
      body: {
        userId: targetUserId,
        type,
        title,
        message,
        priority: "normal",
        actionUrl: "/chats",
        channels: ["push", "telegram", "email"],
      },
    });

    if (notificationError) {
      console.error("[CHAT_INTRO_NOTIFY] Notification engine failed:", notificationError);
      return new Response(JSON.stringify({ success: false, error: "Notification delivery failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, channels: notificationResult?.channels || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CHAT_INTRO_NOTIFY] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
