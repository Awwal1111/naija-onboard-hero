import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
}

/**
 * Smart Notification Engine
 * Decides which channel(s) to use based on user status:
 * - Online: Push only
 * - Offline: Push + Telegram
 * - Inactive 7+ days: Email
 * - Inactive 14+ days: SMS (urgent only)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, type, title, message, data, priority = 'normal', actionUrl } = await req.json() as SmartNotificationRequest;

    console.log('[SMART_NOTIF] ========================================');
    console.log('[SMART_NOTIF] Processing notification for user:', userId);
    console.log('[SMART_NOTIF] Type:', type, 'Priority:', priority);

    // 1. Get user profile and presence info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone_number, telegram_user_id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('[SMART_NOTIF] Profile error:', profileError);
    }

    // Get user email from auth
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authData?.user?.email;

    // 2. Check user presence (online status)
    const { data: presence } = await supabase
      .from('user_presence')
      .select('status, last_seen')
      .eq('user_id', userId)
      .single();

    const isOnline = presence?.status === 'online';
    const lastSeen = presence?.last_seen ? new Date(presence.last_seen) : null;
    const now = new Date();

    // Calculate inactivity
    let daysInactive = 0;
    if (lastSeen) {
      daysInactive = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 3. Get last signin
    const { data: lastSignin } = await supabase
      .from('daily_signins')
      .select('signin_date')
      .eq('user_id', userId)
      .order('signin_date', { ascending: false })
      .limit(1)
      .single();

    if (lastSignin) {
      const signinDate = new Date(lastSignin.signin_date);
      const daysSinceSignin = Math.floor((now.getTime() - signinDate.getTime()) / (1000 * 60 * 60 * 24));
      daysInactive = Math.max(daysInactive, daysSinceSignin);
    }

    console.log('[SMART_NOTIF] User status: online=', isOnline, ', daysInactive=', daysInactive);
    console.log('[SMART_NOTIF] Has Telegram:', !!profile?.telegram_user_id);
    console.log('[SMART_NOTIF] Has Email:', !!userEmail);
    console.log('[SMART_NOTIF] Has Phone:', !!profile?.phone_number);

    const channels: string[] = [];
    const results: any = {};

    // 4. Always create in-app notification
    console.log('[SMART_NOTIF] 1️⃣ Creating in-app notification...');
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: { ...data, actionUrl, channels: [] } // Will update after
      });

    if (notifError) {
      console.error('[SMART_NOTIF] ❌ In-app notification error:', notifError);
    } else {
      channels.push('in_app');
      console.log('[SMART_NOTIF] ✅ In-app notification created');
    }

    // 5. Send push notification (always attempt)
    console.log('[SMART_NOTIF] 2️⃣ Sending push notification...');
    try {
      const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title,
          body: message,
          icon: '/icon-512.png',
          badge: '/icon-512.png',
          data: { type, ...data },
          url: actionUrl || '/main-feed'
        }
      });

      if (pushError) {
        console.error('[SMART_NOTIF] ❌ Push error:', pushError);
      } else if (pushData?.success) {
        channels.push('push');
        results.push = pushData;
        console.log('[SMART_NOTIF] ✅ Push sent to', pushData.sent, 'subscription(s)');
      }
    } catch (err) {
      console.error('[SMART_NOTIF] ❌ Push failed:', err);
    }

    // 6. Send Telegram (if offline or not reached via push)
    if (profile?.telegram_user_id && (!isOnline || priority === 'high' || priority === 'urgent')) {
      console.log('[SMART_NOTIF] 3️⃣ Sending Telegram notification...');
      try {
        const telegramMessage = `🔔 *${title}*\n\n${message}`;
        const { data: telegramData, error: telegramError } = await supabase.functions.invoke('send-telegram-notification', {
          body: {
            user_id: userId,
            message: telegramMessage,
            parse_mode: 'Markdown'
          }
        });

        if (telegramError) {
          console.error('[SMART_NOTIF] ❌ Telegram error:', telegramError);
        } else if (telegramData?.success) {
          channels.push('telegram');
          results.telegram = telegramData;
          console.log('[SMART_NOTIF] ✅ Telegram sent');
        }
      } catch (err) {
        console.error('[SMART_NOTIF] ❌ Telegram failed:', err);
      }
    }

    // 7. Send email (if inactive 7+ days OR high priority)
    if (userEmail && (daysInactive >= 7 || priority === 'high' || priority === 'urgent')) {
      console.log('[SMART_NOTIF] 4️⃣ Sending email notification...');
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-notification', {
          body: {
            userId,
            type,
            title,
            message,
            metadata: data,
            sendEmail: true,
            emailTemplate: 'general'
          }
        });

        if (emailError) {
          console.error('[SMART_NOTIF] ❌ Email error:', emailError);
        } else {
          channels.push('email');
          results.email = emailData;
          console.log('[SMART_NOTIF] ✅ Email sent');
        }
      } catch (err) {
        console.error('[SMART_NOTIF] ❌ Email failed:', err);
      }
    }

    // 8. Send SMS (if inactive 14+ days AND urgent priority AND has phone)
    if (profile?.phone_number && daysInactive >= 14 && priority === 'urgent') {
      console.log('[SMART_NOTIF] 5️⃣ Sending SMS notification (urgent, inactive 14+ days)...');
      try {
        const smsMessage = `NaijaLancers: ${title} - ${message.substring(0, 100)}`;
        const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            userId,
            message: smsMessage
          }
        });

        if (smsError) {
          console.error('[SMART_NOTIF] ❌ SMS error:', smsError);
        } else if (smsData?.success) {
          channels.push('sms');
          results.sms = smsData;
          console.log('[SMART_NOTIF] ✅ SMS sent');
        }
      } catch (err) {
        console.error('[SMART_NOTIF] ❌ SMS failed:', err);
      }
    }

    console.log('[SMART_NOTIF] 🎉 Notification processed via channels:', channels.join(', '));
    console.log('[SMART_NOTIF] ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        channels,
        results,
        userStatus: {
          isOnline,
          daysInactive,
          hasTelegram: !!profile?.telegram_user_id,
          hasEmail: !!userEmail,
          hasPhone: !!profile?.phone_number
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SMART_NOTIF] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
