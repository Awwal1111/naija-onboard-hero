import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateMessageRequest {
  userId: string;
  messageType: 'incomplete_profile' | 'inactive' | 'milestone' | 'custom';
  customPrompt?: string;
  channel: 'email' | 'sms' | 'both';
}

/**
 * Generate AI-Powered Engagement Message
 * Uses Gemini to create personalized engagement messages for individual users
 * based on their profile, activity, and user mode (freelancer/client).
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

    const { userId, messageType, customPrompt, channel } = await req.json() as GenerateMessageRequest;

    console.log('[GENERATE-MESSAGE] Generating message for user:', userId);
    console.log('[GENERATE-MESSAGE] Type:', messageType, 'Channel:', channel);

    // Fetch comprehensive user data
    const { data: profile, error: profileError } = await supabase
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
        is_expert,
        is_premium,
        wallet_balance,
        balance_withdrawable,
        created_at
      `)
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;

    // Get user activity stats
    const { count: jobsPosted } = await supabase
      .from('job_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: jobsApplied } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('applicant_id', userId);

    const { count: messagesReceived } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId);

    const { data: lastSignin } = await supabase
      .from('daily_signins')
      .select('signin_date')
      .eq('user_id', userId)
      .order('signin_date', { ascending: false })
      .limit(1)
      .single();

    // Calculate profile completion
    const requiredFields = ['full_name', 'profession', 'phone_number', 'bio'];
    const missingFields = requiredFields.filter(field => !profile[field] || profile[field]?.trim() === '');
    const completionPercentage = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100);

    // Calculate days since signup and last activity
    const daysSinceSignup = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastLogin = lastSignin 
      ? Math.floor((Date.now() - new Date(lastSignin.signin_date).getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceSignup;

    // Build context for AI
    const userContext = {
      name: profile.full_name?.split(' ')[0] || 'User',
      fullName: profile.full_name,
      userMode: profile.user_mode || 'freelancer',
      profession: profile.profession,
      location: profile.state_name || profile.area || 'Unknown',
      isExpert: profile.is_expert,
      isPremium: profile.is_premium,
      walletBalance: profile.wallet_balance || 0,
      profileCompletion: completionPercentage,
      missingFields,
      daysSinceSignup,
      daysSinceLastLogin,
      activity: {
        jobsPosted: jobsPosted || 0,
        jobsApplied: jobsApplied || 0,
        messagesReceived: messagesReceived || 0
      }
    };

    // Generate AI message
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      // Fallback to template-based message
      const fallbackMessage = generateFallbackMessage(userContext, messageType);
      return new Response(JSON.stringify({
        success: true,
        generated: false,
        emailSubject: fallbackMessage.subject,
        emailBody: fallbackMessage.emailBody,
        smsMessage: fallbackMessage.smsMessage,
        userContext
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = buildSystemPrompt(userContext, messageType, channel);
    const userPrompt = customPrompt || buildUserPrompt(userContext, messageType);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('[GENERATE-MESSAGE] AI error:', response.status);
      const fallbackMessage = generateFallbackMessage(userContext, messageType);
      return new Response(JSON.stringify({
        success: true,
        generated: false,
        ...fallbackMessage,
        userContext
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    let generatedMessage;
    try {
      generatedMessage = JSON.parse(content);
    } catch {
      console.error('[GENERATE-MESSAGE] Failed to parse AI response');
      const fallbackMessage = generateFallbackMessage(userContext, messageType);
      return new Response(JSON.stringify({
        success: true,
        generated: false,
        ...fallbackMessage,
        userContext
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[GENERATE-MESSAGE] ✅ AI message generated successfully');

    return new Response(JSON.stringify({
      success: true,
      generated: true,
      emailSubject: generatedMessage.emailSubject || generatedMessage.subject,
      emailBody: generatedMessage.emailBody || generatedMessage.email,
      smsMessage: generatedMessage.smsMessage || generatedMessage.sms,
      userContext,
      rawAiResponse: generatedMessage
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[GENERATE-MESSAGE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(context: any, messageType: string, channel: string): string {
  return `You are a professional engagement copywriter for NaijaLancers, Nigeria's #1 freelance marketplace.

Your task: Generate personalized ${messageType} engagement messages for this user.

USER CONTEXT:
- Name: ${context.name} (${context.fullName})
- User Mode: ${context.userMode} (${context.userMode === 'client' ? 'Hires freelancers' : context.userMode === 'freelancer' ? 'Offers services' : 'Both hires and offers services'})
- Profession: ${context.profession || 'Not specified'}
- Location: ${context.location}
- Profile Completion: ${context.profileCompletion}%
- Missing Fields: ${context.missingFields.join(', ') || 'None'}
- Days Since Signup: ${context.daysSinceSignup}
- Days Since Last Login: ${context.daysSinceLastLogin}
- Expert Status: ${context.isExpert ? 'Verified Expert' : 'Regular User'}
- Wallet Balance: ₦${context.walletBalance}
- Activity: Posted ${context.activity.jobsPosted} jobs, Applied to ${context.activity.jobsApplied} jobs, Received ${context.activity.messagesReceived} messages

WRITING GUIDELINES:
1. Be warm and personal - use their first name
2. Highlight benefits specific to their user mode (freelancer vs client)
3. Create urgency without being pushy
4. Include a clear call-to-action
5. For SMS: Keep under 160 characters
6. For Email: Be conversational but professional

BRAND VOICE:
- Friendly and encouraging
- Nigerian context (use local references when appropriate)
- Focus on opportunity and growth
- Founded by Awwal Dayyabu

OUTPUT FORMAT (JSON):
{
  "emailSubject": "Catchy subject line",
  "emailBody": "Full email body with greeting, main message, and CTA",
  "smsMessage": "Short SMS under 160 chars with CTA"
}`;
}

function buildUserPrompt(context: any, messageType: string): string {
  switch (messageType) {
    case 'incomplete_profile':
      return `Generate a personalized message encouraging ${context.name} to complete their profile. 
      They are missing: ${context.missingFields.join(', ')}. 
      Their profile is ${context.profileCompletion}% complete.
      As a ${context.userMode}, emphasize the benefits they'll get from a complete profile.`;
    
    case 'inactive':
      return `Generate a re-engagement message for ${context.name} who hasn't logged in for ${context.daysSinceLastLogin} days.
      They are a ${context.userMode} ${context.profession ? `in ${context.profession}` : ''}.
      Mention what they might be missing and create urgency to return.`;
    
    case 'milestone':
      return `Generate a congratulatory message for ${context.name}.
      They've been a member for ${context.daysSinceSignup} days.
      Highlight their achievements and encourage continued engagement.`;
    
    default:
      return `Generate an engaging message for ${context.name}, a ${context.userMode} on NaijaLancers.
      Make it relevant to their profile and encourage platform engagement.`;
  }
}

function generateFallbackMessage(context: any, messageType: string): {
  subject: string;
  emailBody: string;
  smsMessage: string;
} {
  const name = context.name || 'there';
  const userMode = context.userMode || 'freelancer';

  if (messageType === 'incomplete_profile') {
    const modeHint = userMode === 'client' 
      ? 'Complete profiles get 3x more responses from top experts!'
      : 'Complete profiles appear higher in search and get more job offers!';
    
    return {
      subject: `${name}, your profile is ${context.profileCompletion}% complete`,
      emailBody: `Hi ${name},\n\nYour NaijaLancers profile is almost ready! ${modeHint}\n\nJust add your ${context.missingFields[0] || 'missing info'} to unlock all features.\n\nComplete your profile now:\nhttps://naijalancers.name.ng/profile?edit=true\n\nBest,\nThe NaijaLancers Team`,
      smsMessage: `NaijaLancers: ${name}, finish your profile (${context.profileCompletion}% done). Add ${context.missingFields[0] || 'info'}. naijalancers.name.ng/profile`
    };
  }

  if (messageType === 'inactive') {
    return {
      subject: `We miss you, ${name}! 👋`,
      emailBody: `Hi ${name},\n\nIt's been ${context.daysSinceLastLogin} days since your last visit to NaijaLancers.\n\n${userMode === 'client' ? 'New talented freelancers have joined and are ready to help with your projects!' : 'New jobs matching your skills have been posted!'}\n\nCome back and see what you've been missing:\nhttps://naijalancers.name.ng\n\nBest,\nThe NaijaLancers Team`,
      smsMessage: `NaijaLancers: ${name}, we miss you! New ${userMode === 'client' ? 'experts' : 'jobs'} waiting. Login now!`
    };
  }

  return {
    subject: `${name}, check out what's new on NaijaLancers!`,
    emailBody: `Hi ${name},\n\nThank you for being part of NaijaLancers!\n\nVisit your dashboard to explore new opportunities.\n\nBest,\nThe NaijaLancers Team`,
    smsMessage: `NaijaLancers: ${name}, new opportunities await! Visit naijalancers.name.ng`
  };
}
