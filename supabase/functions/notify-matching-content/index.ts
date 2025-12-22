import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentNotificationRequest {
  contentType: 'gig' | 'course' | 'expert' | 'fundraising' | 'post';
  contentId: string;
  creatorId: string;
}

/**
 * Notify users when new content matches their interests:
 * - New gigs matching their skills
 * - New courses in their field
 * - New experts in their profession
 * - New fundraising campaigns
 * - Trending posts
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

    const { contentType, contentId, creatorId } = await req.json() as ContentNotificationRequest;

    console.log('[MATCH_NOTIF] ========================================');
    console.log('[MATCH_NOTIF] New content:', contentType, contentId);

    let content: any;
    let usersToNotify: any[] = [];
    let title = '';
    let message = '';
    let actionUrl = '';

    switch (contentType) {
      case 'gig': {
        // Get the job post
        const { data: job, error } = await supabase
          .from('job_posts')
          .select('id, title, description, budget_min, budget_max, user_id, location_state')
          .eq('id', contentId)
          .single();

        if (error || !job) {
          throw new Error('Job not found');
        }

        content = job;

        // Get creator info
        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', creatorId)
          .single();

        title = `🎯 New Gig Alert: ${job.title}`;
        message = `Budget: ₦${job.budget_min?.toLocaleString()}-${job.budget_max?.toLocaleString()}. Apply now!`;
        actionUrl = `/jobs/${job.id}`;

        // Find users with matching skills or in same state
        // Get all experts first
        const { data: experts } = await supabase
          .from('profiles')
          .select('user_id, full_name, telegram_user_id, profession')
          .eq('is_expert', true)
          .neq('user_id', creatorId)
          .limit(50);

        usersToNotify = experts || [];

        // Also get users in same state
        if (job.location_state) {
          const { data: stateUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name, telegram_user_id')
            .eq('state_name', job.location_state)
            .neq('user_id', creatorId)
            .not('user_id', 'in', `(${usersToNotify.map(u => `'${u.user_id}'`).join(',') || "''"})`)
            .limit(30);

          usersToNotify = [...usersToNotify, ...(stateUsers || [])];
        }
        break;
      }

      case 'course': {
        const { data: course, error } = await supabase
          .from('courses')
          .select('id, title, price, description, course_category, user_id')
          .eq('id', contentId)
          .single();

        if (error || !course) {
          throw new Error('Course not found');
        }

        content = course;

        // Get creator info
        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', creatorId)
          .single();

        title = `📚 New Course: ${course.title}`;
        message = `By ${creator?.full_name || 'an expert'}. Price: ₦${course.price?.toLocaleString()}`;
        actionUrl = `/courses/${course.id}`;

        // Notify connections of the course creator
        const { data: connections } = await supabase
          .from('connections')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${creatorId},user2_id.eq.${creatorId}`);

        const connectedUserIds = (connections || []).map(c => 
          c.user1_id === creatorId ? c.user2_id : c.user1_id
        );

        if (connectedUserIds.length > 0) {
          const { data: connectedUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name, telegram_user_id')
            .in('user_id', connectedUserIds);

          usersToNotify = connectedUsers || [];
        }
        break;
      }

      case 'expert': {
        // A new expert was verified
        const { data: expert, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, state_name, lga_name, profile_picture_url')
          .eq('user_id', contentId)
          .single();

        if (error || !expert) {
          throw new Error('Expert not found');
        }

        content = expert;
        title = `⭐ New Expert: ${expert.full_name}`;
        message = `${expert.profession || 'Professional'} from ${expert.state_name || 'Nigeria'}. View profile!`;
        actionUrl = `/profile/${expert.user_id}`;

        // Notify users in same state
        if (expert.state_name) {
          const { data: stateUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name, telegram_user_id')
            .eq('state_name', expert.state_name)
            .neq('user_id', contentId)
            .limit(50);

          usersToNotify = stateUsers || [];
        }
        break;
      }

      case 'fundraising': {
        const { data: fundraising, error } = await supabase
          .from('fundraisings')
          .select('id, title, description, goal_amount, user_id, category')
          .eq('id', contentId)
          .single();

        if (error || !fundraising) {
          throw new Error('Fundraising not found');
        }

        content = fundraising;

        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name, state_name')
          .eq('user_id', creatorId)
          .single();

        title = `🙏 New Campaign: ${fundraising.title}`;
        message = `By ${creator?.full_name || 'a member'}. Goal: ₦${fundraising.goal_amount?.toLocaleString()}`;
        actionUrl = `/fundraising/${fundraising.id}`;

        // Notify connections and users in same state
        const { data: connections } = await supabase
          .from('connections')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${creatorId},user2_id.eq.${creatorId}`);

        const connectedUserIds = (connections || []).map(c => 
          c.user1_id === creatorId ? c.user2_id : c.user1_id
        );

        if (connectedUserIds.length > 0) {
          const { data: connectedUsers } = await supabase
            .from('profiles')
            .select('user_id, full_name, telegram_user_id')
            .in('user_id', connectedUserIds);

          usersToNotify = connectedUsers || [];
        }
        break;
      }

      default:
        throw new Error('Invalid content type');
    }

    console.log('[MATCH_NOTIF] Found', usersToNotify.length, 'users to notify');

    let notifiedCount = 0;

    for (const user of usersToNotify.slice(0, 100)) { // Limit to 100 notifications
      try {
        await supabase.functions.invoke('smart-notification', {
          body: {
            userId: user.user_id,
            type: `new_${contentType}`,
            title,
            message,
            priority: 'normal',
            data: { contentType, contentId, creatorId },
            actionUrl
          }
        });
        notifiedCount++;
      } catch (err) {
        console.error('[MATCH_NOTIF] Error notifying:', user.user_id, err);
      }
    }

    console.log('[MATCH_NOTIF] ✅ Notified', notifiedCount, 'users');
    console.log('[MATCH_NOTIF] ========================================');

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MATCH_NOTIF] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
