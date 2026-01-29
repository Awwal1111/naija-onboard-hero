import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  message: string;
  parse_mode?: "Markdown" | "HTML";
  // LinkedIn-style rich features
  reply_markup?: string; // JSON string for inline keyboard
  photo_url?: string;
  disable_notification?: boolean;
  buttons?: Array<{ text: string; url?: string; callback_data?: string }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { 
      user_id, 
      message, 
      parse_mode = "Markdown",
      reply_markup,
      photo_url,
      disable_notification = false,
      buttons
    } = payload;

    console.log('========================================');
    console.log(`[TELEGRAM] 📤 Enhanced notification to user ${user_id}`);
    console.log(`[TELEGRAM] Message length: ${message.length} chars`);

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[TELEGRAM] ❌ TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, reason: "Telegram bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's telegram_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("telegram_user_id, full_name")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      console.error('[TELEGRAM] ❌ Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, reason: "Error fetching user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.telegram_user_id) {
      console.log(`[TELEGRAM] ⚠️ User ${user_id} doesn't have Telegram linked`);
      return new Response(
        JSON.stringify({ success: false, reason: "No Telegram account linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TELEGRAM] Found Telegram ID: ${profile.telegram_user_id} for ${profile.full_name}`);

    // Build inline keyboard from buttons array if provided
    let keyboardMarkup = reply_markup;
    if (buttons && buttons.length > 0 && !keyboardMarkup) {
      const keyboard = buttons.map(btn => {
        if (btn.url) {
          return [{ text: btn.text, url: btn.url }];
        } else if (btn.callback_data) {
          return [{ text: btn.text, callback_data: btn.callback_data }];
        }
        return [{ text: btn.text, callback_data: btn.text }];
      });
      keyboardMarkup = JSON.stringify({ inline_keyboard: keyboard });
    }

    // Send message with optional photo
    let response;
    const chatId = parseInt(profile.telegram_user_id);

    if (photo_url) {
      // Send photo with caption
      response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photo_url,
          caption: message,
          parse_mode: parse_mode,
          disable_notification: disable_notification,
          ...(keyboardMarkup && { reply_markup: JSON.parse(keyboardMarkup) })
        })
      });
    } else {
      // Send text message
      response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parse_mode,
          disable_notification: disable_notification,
          disable_web_page_preview: false, // Enable link previews like LinkedIn
          ...(keyboardMarkup && { reply_markup: JSON.parse(keyboardMarkup) })
        })
      });
    }

    const result = await response.json();

    if (!response.ok) {
      console.error(`[TELEGRAM] ❌ Failed to send message:`, result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful notification to database for analytics
    try {
      await supabase.from('notifications').insert({
        user_id: user_id,
        title: 'Telegram Notification',
        message: message.substring(0, 200),
        type: 'telegram',
        is_read: false,
        metadata: { 
          telegram_message_id: result.result?.message_id,
          has_buttons: !!keyboardMarkup,
          has_photo: !!photo_url
        }
      });
    } catch (logError) {
      console.log('[TELEGRAM] ⚠️ Could not log notification (non-critical):', logError);
    }

    console.log(`[TELEGRAM] ✅ Enhanced notification sent to ${profile.full_name}`);
    console.log(`[TELEGRAM] Features: buttons=${!!keyboardMarkup}, photo=${!!photo_url}`);
    console.log('========================================');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: result.result?.message_id,
        features: { buttons: !!keyboardMarkup, photo: !!photo_url }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[TELEGRAM] ❌ Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
