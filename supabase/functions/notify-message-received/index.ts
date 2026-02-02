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

    console.log(`[MSG_NOTIFY] ========================================`);
    console.log(`[MSG_NOTIFY] Notifying ${recipient_id} about message from ${sender_id}`);
    console.log(`[MSG_NOTIFY] Message ID: ${message_id}`);
    console.log(`[MSG_NOTIFY] Content preview: ${content?.substring(0, 50)}...`);

    // Check if recipient has premium subscription (required for SMS/Email - but NOT for Telegram)
    const { data: premiumCheck } = await supabase.rpc('check_premium_status', {
      p_user_id: recipient_id
    });
    const isPremium = premiumCheck === true;
    console.log(`[MSG_NOTIFY] Recipient premium status: ${isPremium}`);

    // IMPORTANT: Telegram notifications are FREE for all users
    // Only SMS and Email require premium subscription

    // Get sender profile
    const { data: sender, error: senderError } = await supabase
      .from("profiles")
      .select("full_name, profession, is_expert")
      .eq("user_id", sender_id)
      .single();

    if (senderError) {
      console.log(`[MSG_NOTIFY] Sender profile error:`, senderError.message);
    }
    console.log(`[MSG_NOTIFY] Sender: ${sender?.full_name || 'Unknown'}`);

    // Get recipient profile with Telegram ID and phone number
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("full_name, telegram_user_id, phone_number")
      .eq("user_id", recipient_id)
      .single();

    if (recipientError) {
      console.log(`[MSG_NOTIFY] Recipient profile error:`, recipientError.message);
    }
    console.log(`[MSG_NOTIFY] Recipient: ${recipient?.full_name || 'Unknown'}`);
    console.log(`[MSG_NOTIFY] Recipient Telegram ID: ${recipient?.telegram_user_id || 'NOT LINKED'}`);

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

    // Check if this is a FIRST RESPONSE from freelancer to client
    // This is a high-priority notification for clients waiting on responses
    let isFirstResponse = false;
    let isExpertResponse = false;
    
    if (sender?.is_expert) {
      isExpertResponse = true;
      
      // Check if this is the first message from the expert in this conversation
      const { data: prevMessages } = await supabase
        .from("messages")
        .select("id")
        .eq("chat_id", message_id.split('_')[0]) // This won't work, need chat_id
        .eq("sender_id", sender_id)
        .limit(2);
      
      // If expert has sent less than 2 messages, this might be their first response
      if (!prevMessages || prevMessages.length <= 1) {
        isFirstResponse = true;
        console.log(`[MSG_NOTIFY] 🎯 First response from expert - HIGH PRIORITY`);
      }
    }

    // Build notification message
    const senderName = sender?.full_name || "Someone";
    const senderTitle = sender?.is_expert ? "🌟 Expert" : sender?.profession || "User";
    
    // Message content for different channels
    const messagePreview = content.length > 100 ? content.substring(0, 100) + "..." : content;
    const displayContent = media_type 
      ? (media_type.startsWith('image') ? '📷 Photo' : media_type.startsWith('video') ? '🎥 Video' : '📎 File')
      : messagePreview;
    
    // Prioritize expert responses in notification text
    const notificationTitle = isExpertResponse 
      ? `🌟 ${senderName} responded!` 
      : `💬 ${senderName}`;

    // Track which channels succeeded
    const results = {
      telegram: false,
      sms: false,
      email: false,
    };

    // 1. Send Telegram notification (if linked) - FREE FOR ALL USERS
    if (recipient?.telegram_user_id) {
      console.log(`[MSG_NOTIFY] 📱 Attempting Telegram to: ${recipient.telegram_user_id}`);
      
      let notificationText = isExpertResponse 
        ? `🌟 *Expert Response!*\n\n`
        : `💬 *New Message!*\n\n`;
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
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        console.log(`[MSG_NOTIFY] Telegram API URL: ${telegramUrl.substring(0, 50)}...`);
        
        const response = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(recipient.telegram_user_id),
            text: notificationText,
            parse_mode: "Markdown"
          })
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
          results.telegram = true;
          console.log(`[MSG_NOTIFY] ✅ Telegram sent to ${recipient.full_name}`);
        } else {
          console.error(`[MSG_NOTIFY] ❌ Telegram API error:`, JSON.stringify(responseData));
        }
      } catch (error) {
        console.error("[MSG_NOTIFY] ❌ Telegram fetch error:", error);
      }
    } else {
      console.log(`[MSG_NOTIFY] ⚠️ Recipient has no Telegram linked - trying push notification`);
      
      // Try sending push notification as fallback
      try {
        const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: recipient_id,
            title: notificationTitle,
            body: displayContent,
            data: { 
              type: 'message', 
              url: '/chats',
              priority: isExpertResponse ? 'high' : 'normal'
            }
          }
        });
        
        if (pushError) {
          console.log(`[MSG_NOTIFY] Push notification error:`, pushError);
        } else if (pushResult?.success) {
          console.log(`[MSG_NOTIFY] ✅ Push notification sent as fallback`);
          results.telegram = true; // Count as success for tracking
        } else {
          console.log(`[MSG_NOTIFY] Push notification not sent - user may not have enabled push`);
        }
      } catch (pushErr) {
        console.log(`[MSG_NOTIFY] Push fallback failed:`, pushErr);
      }
    }

    // 2. Send SMS notification (FREE for all users - communication is free)
    // Using centralized send-sms function with skipCharge=true for messages
    if (recipient?.phone_number) {
      const smsText = `NaijaLancers: ${senderName} sent you a message: "${displayContent}". Open the app to reply.`;
      
      try {
        const { data: smsResult } = await supabase.functions.invoke('send-sms', {
          body: {
            userId: recipient_id, // FIXED: was recipientId (typo)
            message: smsText.substring(0, 160),
            smsType: 'notification',
            skipCharge: true // Communication is free
          }
        });
        
        results.sms = smsResult?.success || false;
        if (smsResult?.success) {
          console.log(`[MSG_NOTIFY] ✅ SMS sent (free communication)`);
        }
      } catch (smsErr) {
        console.log(`[MSG_NOTIFY] SMS failed:`, smsErr);
      }
    }

    // 3. Send Email notification (FREE for all users - communication is free)
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
