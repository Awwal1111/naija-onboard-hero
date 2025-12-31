import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const HTTPSMS_API_KEY = Deno.env.get("HTTPSMS_API_KEY");
const HTTPSMS_PHONE = Deno.env.get("HTTPSMS_PHONE") || "+2348061551614";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

// Send SMS via HTTPSMS
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  if (!HTTPSMS_API_KEY) {
    console.log("[MSG_NOTIFY] HTTPSMS_API_KEY not configured, skipping SMS");
    return false;
  }

  try {
    // Format phone number for Nigeria
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+234' + formattedPhone;
    }

    const response = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: {
        "x-api-key": HTTPSMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        from: HTTPSMS_PHONE,
        to: formattedPhone,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`[MSG_NOTIFY] ✅ SMS sent to ${formattedPhone}`);
      return true;
    } else {
      console.error(`[MSG_NOTIFY] SMS failed:`, result);
      return false;
    }
  } catch (error) {
    console.error("[MSG_NOTIFY] SMS error:", error);
    return false;
  }
}

// Send Email via Resend
async function sendEmail(email: string, senderName: string, content: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[MSG_NOTIFY] RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    
    const previewContent = content.length > 200 ? content.substring(0, 200) + "..." : content;
    
    const { error } = await resend.emails.send({
      from: "NaijaLancers <notifications@naijalancers.name.ng>",
      to: [email],
      subject: `💬 New message from ${senderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message</h1>
            </div>
            <div style="padding: 24px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
                <strong>${senderName}</strong> sent you a message on NaijaLancers:
              </p>
              <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="color: #4b5563; font-size: 14px; margin: 0; font-style: italic;">
                  "${previewContent}"
                </p>
              </div>
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://naijalancers.name.ng/chats" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Reply Now
                </a>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} NaijaLancers. Don't miss important messages!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(`[MSG_NOTIFY] Email failed:`, error);
      return false;
    }
    
    console.log(`[MSG_NOTIFY] ✅ Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[MSG_NOTIFY] Email error:", error);
    return false;
  }
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

    // Get recipient profile with Telegram ID and phone number
    const { data: recipient } = await supabase
      .from("profiles")
      .select("full_name, telegram_user_id, phone_number")
      .eq("user_id", recipient_id)
      .single();

    // Get recipient email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(recipient_id);
    const recipientEmail = authUser?.user?.email;

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
    
    // Message content for different channels
    const messagePreview = content.length > 100 ? content.substring(0, 100) + "..." : content;
    const displayContent = media_type 
      ? (media_type.startsWith('image') ? '📷 Photo' : media_type.startsWith('video') ? '🎥 Video' : '📎 File')
      : messagePreview;

    // Track which channels succeeded
    const results = {
      telegram: false,
      sms: false,
      email: false,
    };

    // 1. Send Telegram notification (if linked)
    if (recipient?.telegram_user_id) {
      let notificationText = `💬 *New Message!*\n\n`;
      notificationText += `From: *${senderName}* (${senderTitle})\n\n`;

      if (media_type) {
        const mediaEmoji = media_type.startsWith('image') ? '📷' : 
                          media_type.startsWith('video') ? '🎥' : 
                          media_type.startsWith('audio') ? '🎵' : '📎';
        notificationText += `${mediaEmoji} ${content || 'Sent a file'}\n\n`;
      } else {
        notificationText += `"${messagePreview}"\n\n`;
      }
      notificationText += `🔔 Open the app to reply!`;

      try {
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
        
        if (response.ok) {
          results.telegram = true;
          console.log(`[MSG_NOTIFY] ✅ Telegram sent to ${recipient.full_name}`);
        }
      } catch (error) {
        console.error("[MSG_NOTIFY] Telegram error:", error);
      }
    }

    // 2. Send SMS notification (if phone number exists)
    if (recipient?.phone_number) {
      const smsText = `NaijaLancers: ${senderName} sent you a message: "${displayContent}". Open the app to reply.`;
      results.sms = await sendSMS(recipient.phone_number, smsText);
    }

    // 3. Send Email notification (if email exists)
    if (recipientEmail) {
      results.email = await sendEmail(recipientEmail, senderName, displayContent);
    }

    // Log successful notification channels
    const successfulChannels = Object.entries(results)
      .filter(([_, success]) => success)
      .map(([channel]) => channel);

    console.log(`[MSG_NOTIFY] ✅ Notification sent via: ${successfulChannels.join(', ') || 'none'}`);

    return new Response(
      JSON.stringify({ 
        success: successfulChannels.length > 0,
        channels: results 
      }),
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
