import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface NotificationPayload {
  user_id: string;
  message: string;
  parse_mode?: "Markdown" | "HTML";
}

serve(async (req) => {
  try {
    const { user_id, message, parse_mode = "Markdown" }: NotificationPayload = await req.json();

    console.log(`Sending notification to user ${user_id}`);

    // Get user's telegram_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_user_id, full_name")
      .eq("user_id", user_id)
      .single();

    if (!profile?.telegram_user_id) {
      console.log(`User ${user_id} doesn't have Telegram linked`);
      return new Response(
        JSON.stringify({ success: false, reason: "No Telegram account linked" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send Telegram message
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: parseInt(profile.telegram_user_id),
        text: message,
        parse_mode: parse_mode
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Failed to send Telegram message:`, result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Notification sent successfully to ${profile.full_name}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
