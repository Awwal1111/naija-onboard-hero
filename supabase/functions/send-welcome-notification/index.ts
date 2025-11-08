import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`[WELCOME] Sending welcome notification to user: ${user.id}`);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, telegram_user_id, user_role, is_expert")
      .eq("user_id", user.id)
      .single();

    if (!profile?.telegram_user_id) {
      console.log(`[WELCOME] User ${user.id} doesn't have Telegram linked`);
      return new Response(
        JSON.stringify({ success: false, reason: "No Telegram account linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Customize welcome message based on user role
    let welcomeMessage = `🎉 *Welcome back, ${profile.full_name}!*\n\n`;
    
    if (profile.is_expert) {
      welcomeMessage += `👨‍💼 *Expert Dashboard*\n\n` +
        `As an expert on NaijaLancers, you have access to:\n\n` +
        `✅ Premium job opportunities\n` +
        `✅ Direct client messaging\n` +
        `✅ Verified expert badge\n` +
        `✅ Priority support\n\n` +
        `💡 *Tip:* Keep your profile updated and respond to messages quickly to get more clients!\n\n` +
        `📊 Check your dashboard for new job opportunities and messages.`;
    } else {
      welcomeMessage += `🚀 *Getting Started*\n\n` +
        `Here's what you can do today:\n\n` +
        `💰 Complete tasks and earn NC\n` +
        `📝 Post jobs and find experts\n` +
        `🎯 Claim your daily sign-in bonus\n` +
        `🤝 Connect with professionals\n\n` +
        `💡 *Tip:* Complete your profile to unlock more features!`;
    }

    // Send Telegram message
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: parseInt(profile.telegram_user_id),
        text: welcomeMessage,
        parse_mode: "Markdown"
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[WELCOME] Failed to send Telegram message:`, result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WELCOME] Welcome notification sent successfully to ${profile.full_name}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WELCOME] Error sending welcome notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
