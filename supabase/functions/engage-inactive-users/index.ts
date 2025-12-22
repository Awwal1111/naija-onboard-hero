import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Engage Inactive Users
 * Scheduled function to re-engage users who haven't been active:
 * - 7 days inactive: Email with personalized content
 * - 14 days inactive: SMS (if available)
 * 
 * Content is personalized based on:
 * - User's skills/interests
 * - New matching gigs
 * - New users in their location
 * - New experts/courses in their field
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

    console.log('[ENGAGE] ========================================');
    console.log('[ENGAGE] Starting inactive user engagement check');
    console.log('[ENGAGE] Time:', new Date().toISOString());

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get inactive users (no signin in 7+ days, but active in last 30 days)
    const { data: inactiveUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        phone_number,
        telegram_user_id,
        state_name,
        lga_name,
        profession,
        is_expert
      `)
      .gte('created_at', thirtyDaysAgo.toISOString()); // Users who joined in last 30 days

    if (usersError) {
      console.error('[ENGAGE] Error fetching users:', usersError);
      throw usersError;
    }

    console.log('[ENGAGE] Found', inactiveUsers?.length || 0, 'potential users to check');

    let emailsSent = 0;
    let smsSent = 0;
    let telegramSent = 0;
    const results: any[] = [];

    for (const user of inactiveUsers || []) {
      // Check last signin date
      const { data: lastSignin } = await supabase
        .from('daily_signins')
        .select('signin_date')
        .eq('user_id', user.user_id)
        .order('signin_date', { ascending: false })
        .limit(1)
        .single();

      const lastSigninDate = lastSignin ? new Date(lastSignin.signin_date) : null;
      const daysInactive = lastSigninDate 
        ? Math.floor((now.getTime() - lastSigninDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Skip if active recently
      if (daysInactive < 7) continue;

      console.log('[ENGAGE] User', user.full_name, 'inactive for', daysInactive, 'days');

      // Get personalized content
      const personalizedContent = await getPersonalizedContent(supabase, user);

      // Check if we already notified this user recently
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('type', 'engagement_reminder')
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1)
        .single();

      if (recentNotif) {
        console.log('[ENGAGE] Already notified', user.full_name, 'recently, skipping');
        continue;
      }

      // Compose message
      const title = `We miss you, ${user.full_name?.split(' ')[0] || 'there'}! 👋`;
      let message = personalizedContent.message;

      // 7-14 days: Email + Telegram
      if (daysInactive >= 7 && daysInactive < 14) {
        // Send email
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
          if (authUser?.user?.email) {
            await supabase.functions.invoke('send-notification', {
              body: {
                userId: user.user_id,
                type: 'engagement_reminder',
                title,
                message,
                metadata: personalizedContent,
                sendEmail: true,
                emailTemplate: 'general'
              }
            });
            emailsSent++;
            console.log('[ENGAGE] ✅ Email sent to', user.full_name);
          }
        } catch (err) {
          console.error('[ENGAGE] ❌ Email error for', user.full_name, err);
        }

        // Send Telegram if available
        if (user.telegram_user_id) {
          try {
            const telegramMsg = `🔔 *${title}*\n\n${message}\n\n👉 Open NaijaLancers now!`;
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                user_id: user.user_id,
                message: telegramMsg,
                parse_mode: 'Markdown'
              }
            });
            telegramSent++;
            console.log('[ENGAGE] ✅ Telegram sent to', user.full_name);
          } catch (err) {
            console.error('[ENGAGE] ❌ Telegram error for', user.full_name, err);
          }
        }
      }

      // 14+ days: Add SMS
      if (daysInactive >= 14 && user.phone_number) {
        try {
          const smsMsg = `NaijaLancers: ${title} ${personalizedContent.shortMessage || 'New opportunities waiting for you!'} Login now!`;
          await supabase.functions.invoke('send-sms', {
            body: {
              userId: user.user_id,
              message: smsMsg.substring(0, 160) // SMS character limit
            }
          });
          smsSent++;
          console.log('[ENGAGE] ✅ SMS sent to', user.full_name);
        } catch (err) {
          console.error('[ENGAGE] ❌ SMS error for', user.full_name, err);
        }
      }

      // Log notification sent
      await supabase
        .from('notifications')
        .insert({
          user_id: user.user_id,
          type: 'engagement_reminder',
          title,
          message,
          metadata: { daysInactive, ...personalizedContent }
        });

      results.push({
        userId: user.user_id,
        name: user.full_name,
        daysInactive,
        channelsSent: []
      });
    }

    console.log('[ENGAGE] ========================================');
    console.log('[ENGAGE] Summary: Emails=', emailsSent, ', Telegram=', telegramSent, ', SMS=', smsSent);
    console.log('[ENGAGE] ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        summary: { emailsSent, telegramSent, smsSent, usersProcessed: results.length },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ENGAGE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getPersonalizedContent(supabase: any, user: any) {
  const content: any = {
    newGigs: 0,
    newExperts: 0,
    newCourses: 0,
    newUsers: 0,
    message: '',
    shortMessage: ''
  };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Count new gigs matching user's profession/state
  if (user.profession || user.state_name) {
    const { count: gigsCount } = await supabase
      .from('job_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)
      .eq('status', 'open');
    content.newGigs = gigsCount || 0;
  }

  // Count new users in same location
  if (user.state_name) {
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('state_name', user.state_name)
      .gte('created_at', sevenDaysAgo);
    content.newUsers = usersCount || 0;
  }

  // Count new experts
  const { count: expertsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_expert', true)
    .gte('expert_verified_at', sevenDaysAgo);
  content.newExperts = expertsCount || 0;

  // Count new courses
  const { count: coursesCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .eq('status', 'published');
  content.newCourses = coursesCount || 0;

  // Build personalized message
  const highlights: string[] = [];
  
  if (content.newGigs > 0) {
    highlights.push(`${content.newGigs} new job${content.newGigs > 1 ? 's' : ''} posted`);
  }
  if (content.newUsers > 0 && user.state_name) {
    highlights.push(`${content.newUsers} new user${content.newUsers > 1 ? 's' : ''} joined from ${user.state_name}`);
  }
  if (content.newExperts > 0) {
    highlights.push(`${content.newExperts} new verified expert${content.newExperts > 1 ? 's' : ''}`);
  }
  if (content.newCourses > 0) {
    highlights.push(`${content.newCourses} new course${content.newCourses > 1 ? 's' : ''} available`);
  }

  if (highlights.length > 0) {
    content.message = `Here's what you missed:\n\n• ${highlights.join('\n• ')}\n\nDon't miss out on these opportunities!`;
    content.shortMessage = highlights[0];
  } else {
    content.message = "Your network is growing! Log in to see what's new and connect with professionals in your area.";
    content.shortMessage = "Your network is growing!";
  }

  return content;
}
