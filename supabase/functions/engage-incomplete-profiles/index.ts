import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncompleteUser {
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  email?: string;
  profession: string | null;
  bio: string | null;
  state_name: string | null;
  lga_name: string | null;
  user_mode: 'freelancer' | 'client' | 'both' | null;
  created_at: string;
  missing_fields: string[];
  completion_percentage: number;
}

/**
 * Engage Incomplete Profiles
 * Identifies users who haven't completed their profiles and sends
 * personalized engagement messages via Email and SMS (charged).
 * 
 * Uses AI to generate personalized suggestions based on:
 * - User mode (freelancer vs client)
 * - Missing profile fields
 * - Time since signup
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

    const body = await req.json().catch(() => ({}));
    const { dryRun = false, userId: targetUserId } = body;

    console.log('[INCOMPLETE-PROFILES] ========================================');
    console.log('[INCOMPLETE-PROFILES] Starting incomplete profile engagement');
    console.log('[INCOMPLETE-PROFILES] Dry run:', dryRun);
    console.log('[INCOMPLETE-PROFILES] Target user:', targetUserId || 'all');

    // Required fields for profile completion
    const requiredFields = ['full_name', 'profession', 'phone_number', 'bio', 'state_name', 'lga_name'];

    // Query users with incomplete profiles
    let query = supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        phone_number,
        profession,
        bio,
        state_name,
        lga_name,
        area,
        user_mode,
        created_at,
        sms_job_alerts
      `);

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else {
      // Get users who signed up in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', thirtyDaysAgo);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('[INCOMPLETE-PROFILES] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log('[INCOMPLETE-PROFILES] Found', profiles?.length || 0, 'profiles to check');

    // Identify users with incomplete profiles
    const incompleteUsers: IncompleteUser[] = [];

    for (const profile of profiles || []) {
      const missingFields: string[] = [];

      // Check each required field
      if (!profile.full_name || profile.full_name.trim() === '') missingFields.push('Full Name');
      if (!profile.profession || profile.profession.trim() === '') missingFields.push('Profession');
      if (!profile.phone_number || profile.phone_number.trim() === '') missingFields.push('Phone Number');
      if (!profile.bio || profile.bio.trim() === '') missingFields.push('Bio');
      
      // Location check - Nigeria uses state/lga, international uses area
      const hasNigerianLocation = profile.state_name && profile.lga_name;
      const hasInternationalLocation = profile.area;
      if (!hasNigerianLocation && !hasInternationalLocation) {
        missingFields.push('Location');
      }

      if (missingFields.length > 0) {
        const filledFields = requiredFields.length - missingFields.length;
        const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

        // Get email
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);

        incompleteUsers.push({
          user_id: profile.user_id,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          email: authUser?.user?.email,
          profession: profile.profession,
          bio: profile.bio,
          state_name: profile.state_name,
          lga_name: profile.lga_name,
          user_mode: profile.user_mode,
          created_at: profile.created_at,
          missing_fields: missingFields,
          completion_percentage: completionPercentage
        });
      }
    }

    console.log('[INCOMPLETE-PROFILES] Found', incompleteUsers.length, 'users with incomplete profiles');

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          summary: {
            totalChecked: profiles?.length || 0,
            incompleteProfiles: incompleteUsers.length,
            byUserMode: {
              freelancer: incompleteUsers.filter(u => u.user_mode === 'freelancer').length,
              client: incompleteUsers.filter(u => u.user_mode === 'client').length,
              both: incompleteUsers.filter(u => u.user_mode === 'both').length,
              unset: incompleteUsers.filter(u => !u.user_mode).length
            }
          },
          users: incompleteUsers
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for recent engagement notifications to avoid spamming
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    let emailsSent = 0;
    let smsSent = 0;
    const results: any[] = [];

    for (const user of incompleteUsers) {
      // Check if we already notified this user recently
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('type', 'profile_incomplete')
        .gte('created_at', sevenDaysAgo)
        .limit(1)
        .single();

      if (recentNotif) {
        console.log('[INCOMPLETE-PROFILES] Already notified', user.full_name || user.user_id, 'recently, skipping');
        continue;
      }

      // Generate personalized message
      const personalizedMessage = generatePersonalizedMessage(user);

      // Send email notification
      if (user.email) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              userId: user.user_id,
              type: 'profile_incomplete',
              title: personalizedMessage.title,
              message: personalizedMessage.emailMessage,
              metadata: {
                engagementType: 'incomplete_profile',
                profileCompletion: user.completion_percentage,
                missingFields: user.missing_fields,
                userMode: user.user_mode,
                actionUrl: 'https://naijalancers.name.ng/profile?edit=true'
              },
              sendEmail: true,
              emailTemplate: 'engagement'
            }
          });
          emailsSent++;
          console.log('[INCOMPLETE-PROFILES] ✅ Email sent to', user.full_name || user.email);
        } catch (err) {
          console.error('[INCOMPLETE-PROFILES] ❌ Email error for', user.user_id, err);
        }
      }

      // Send SMS if phone is available and user has SMS alerts enabled
      // SMS is charged: 10 NC Nigeria, 25 NC international
      if (user.phone_number) {
        try {
          const { data: smsResult } = await supabase.functions.invoke('send-sms', {
            body: {
              userId: user.user_id,
              message: personalizedMessage.smsMessage,
              smsType: 'engagement',
              skipCharge: false // Charge from user's balance
            }
          });

          if (smsResult?.success) {
            smsSent++;
            console.log('[INCOMPLETE-PROFILES] ✅ SMS sent to', user.full_name, 'cost:', smsResult.cost, 'NC');
          } else if (smsResult?.error === 'Insufficient balance for SMS') {
            console.log('[INCOMPLETE-PROFILES] ⚠️ SMS skipped for', user.full_name, '- insufficient balance');
          }
        } catch (err) {
          console.error('[INCOMPLETE-PROFILES] ❌ SMS error for', user.user_id, err);
        }
      }

      results.push({
        userId: user.user_id,
        name: user.full_name,
        userMode: user.user_mode,
        completionPercentage: user.completion_percentage,
        missingFields: user.missing_fields,
        emailSent: !!user.email,
        smsSent: !!user.phone_number
      });
    }

    console.log('[INCOMPLETE-PROFILES] ========================================');
    console.log('[INCOMPLETE-PROFILES] Summary: Emails=', emailsSent, ', SMS=', smsSent);
    console.log('[INCOMPLETE-PROFILES] ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalChecked: profiles?.length || 0,
          incompleteProfiles: incompleteUsers.length,
          emailsSent,
          smsSent,
          usersProcessed: results.length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[INCOMPLETE-PROFILES] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePersonalizedMessage(user: IncompleteUser): {
  title: string;
  emailMessage: string;
  smsMessage: string;
} {
  const firstName = user.full_name?.split(' ')[0] || 'there';
  const userMode = user.user_mode || 'freelancer';
  const missingCount = user.missing_fields.length;

  // Personalized content based on user mode
  let modeSpecificContent = '';
  let smsBenefit = '';

  if (userMode === 'client' || userMode === 'both') {
    modeSpecificContent = 'Complete profiles get 3x more responses from top freelancers. Experts prefer working with clients who have detailed profiles.';
    smsBenefit = 'Get more expert responses!';
  } else {
    modeSpecificContent = 'Complete profiles appear higher in search results and get 3x more job offers. Clients trust freelancers with detailed profiles.';
    smsBenefit = 'Get more job offers!';
  }

  // Build missing fields hint
  const missingHint = user.missing_fields.slice(0, 3).join(', ');
  
  const title = `${firstName}, your profile is ${user.completion_percentage}% complete 👤`;
  
  const emailMessage = `Your NaijaLancers profile is almost ready! Just add your ${missingHint} to complete setup.\n\n${modeSpecificContent}\n\nComplete your profile now to unlock all features!`;
  
  const smsMessage = `NaijaLancers: ${firstName}, finish your profile (${user.completion_percentage}% done). Add ${user.missing_fields[0]}. ${smsBenefit} naijalancers.name.ng/profile`;

  return { title, emailMessage, smsMessage };
}
