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

interface NotificationPayload {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  media_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id, sender_id, recipient_id, content, media_type }: NotificationPayload = await req.json();

    console.log(`[MSG_NOTIFY] Notifying ${recipient_id} about message from ${sender_id}`);

    // Get sender profile
    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name, profession, is_expert")
      .eq("user_id", sender_id)
      .single();

    // Get recipient profile with Telegram ID
    const { data: recipient } = await supabase
      .from("profiles")
      .select("full_name, telegram_user_id")
      .eq("user_id", recipient_id)
      .single();

    if (!recipient?.telegram_user_id) {
      console.log(`[MSG_NOTIFY] Recipient ${recipient_id} doesn't have Telegram linked`);
      return new Response(
        JSON.stringify({ success: false, reason: "No Telegram account linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is online by checking recent activity (last 10 minutes)
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const { data: recentActivity } = await supabase
      .from("user_presence")
      .select("last_seen")
      .eq("user_id", recipient_id)
      .gte("last_seen", tenMinutesAgo.toISOString())
      .maybeSingle();

    // Don't send notification if user is currently online/active
    if (recentActivity) {
      console.log(`[MSG_NOTIFY] User ${recipient_id} is currently active, skipping notification`);
      return new Response(
        JSON.stringify({ success: false, reason: "User is currently active" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ANTI-SPAM: Check if we already sent a notification to this user in the last 5 minutes
    const { data: recentNotifications } = await supabase
      .from("notifications")
      .select("created_at")
      .eq("user_id", recipient_id)
      .eq("type", "message")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentNotifications) {
      console.log(`[MSG_NOTIFY] User ${recipient_id} was notified recently, skipping to prevent spam`);
      return new Response(
        JSON.stringify({ success: false, reason: "Already notified recently" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification message
    const senderName = sender?.full_name || "Someone";
    const senderTitle = sender?.is_expert ? "🌟 Expert" : sender?.profession || "User";
    
    let notificationText = `💬 *New Message!*\n\n`;
    notificationText += `From: *${senderName}* (${senderTitle})\n\n`;

    if (media_type) {
      // Handle media messages
      const mediaEmoji = media_type.startsWith('image') ? '📷' : 
                        media_type.startsWith('video') ? '🎥' : 
                        media_type.startsWith('audio') ? '🎵' : '📎';
      notificationText += `${mediaEmoji} ${content || 'Sent a file'}\n\n`;
    } else {
      // Regular text message - truncate if too long
      const previewContent = content.length > 100 ? content.substring(0, 100) + "..." : content;
      notificationText += `"${previewContent}"\n\n`;
    }

    notificationText += `🔔 Open the app to reply!`;

    // Send Telegram notification
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parseInt(recipient.telegram_user_id),
          text: notificationText,
          parse_mode: "Markdown"
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(`[MSG_NOTIFY] Failed to send Telegram notification:`, result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[MSG_NOTIFY] ✅ Notification sent to ${recipient.full_name}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[MSG_NOTIFY] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
