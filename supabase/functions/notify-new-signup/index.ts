import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Notify users when someone new joins from their state/LGA
 * "Awwal just joined — you may know him, connect now."
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

    const { newUserId } = await req.json();

    console.log('[NEW_SIGNUP_NOTIF] ========================================');
    console.log('[NEW_SIGNUP_NOTIF] Processing new user signup:', newUserId);

    // Get the new user's profile
    const { data: newUser, error: newUserError } = await supabase
      .from('profiles')
      .select('user_id, full_name, state_name, lga_name, area, profession, profile_picture_url')
      .eq('user_id', newUserId)
      .single();

    if (newUserError || !newUser) {
      console.error('[NEW_SIGNUP_NOTIF] New user not found:', newUserError);
      return new Response(
        JSON.stringify({ success: false, error: 'New user not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[NEW_SIGNUP_NOTIF] New user:', newUser.full_name, 'from', newUser.state_name, newUser.lga_name);

    // Skip if no location info
    if (!newUser.state_name) {
      console.log('[NEW_SIGNUP_NOTIF] No location info, skipping notifications');
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find users in the same location (prioritize same LGA, then same state)
    let usersToNotify: any[] = [];

    // First try same LGA
    if (newUser.lga_name) {
      const { data: lgaUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_user_id')
        .eq('state_name', newUser.state_name)
        .eq('lga_name', newUser.lga_name)
        .neq('user_id', newUserId)
        .limit(20);

      usersToNotify = lgaUsers || [];
    }

    // If not enough, add state users
    if (usersToNotify.length < 10) {
      const { data: stateUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_user_id')
        .eq('state_name', newUser.state_name)
        .neq('user_id', newUserId)
        .not('user_id', 'in', `(${usersToNotify.map(u => `'${u.user_id}'`).join(',') || "''"})`)
        .limit(20 - usersToNotify.length);

      usersToNotify = [...usersToNotify, ...(stateUsers || [])];
    }

    console.log('[NEW_SIGNUP_NOTIF] Found', usersToNotify.length, 'users to notify');

    let notifiedCount = 0;

    for (const user of usersToNotify) {
      try {
        const firstName = newUser.full_name?.split(' ')[0] || 'Someone';
        const location = newUser.lga_name ? `${newUser.lga_name}, ${newUser.state_name}` : newUser.state_name;
        const profession = newUser.profession ? ` (${newUser.profession})` : '';

        const title = `${firstName} just joined${profession}`;
        const message = `You may know them — they're from ${location}. Connect now!`;

        // Use smart notification to decide channel
        await supabase.functions.invoke('smart-notification', {
          body: {
            userId: user.user_id,
            type: 'new_user_nearby',
            title,
            message,
            priority: 'normal',
            data: {
              newUserId: newUser.user_id,
              newUserName: newUser.full_name,
              newUserPicture: newUser.profile_picture_url,
              location
            },
            actionUrl: `/profile/${newUser.user_id}`
          }
        });

        notifiedCount++;
      } catch (err) {
        console.error('[NEW_SIGNUP_NOTIF] Error notifying user:', user.user_id, err);
      }
    }

    console.log('[NEW_SIGNUP_NOTIF] ✅ Notified', notifiedCount, 'users');
    console.log('[NEW_SIGNUP_NOTIF] ========================================');

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[NEW_SIGNUP_NOTIF] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
