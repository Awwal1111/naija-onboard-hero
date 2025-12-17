import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Admin AI Assistant request:', { message });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin status
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: adminCheck, error: adminError } = await supabase.rpc('check_is_admin');
    if (adminError || !adminCheck || adminCheck.length === 0 || !adminCheck[0].is_admin) {
      throw new Error('Admin access required');
    }

    // Gather comprehensive admin data
    const [
      { data: pendingArticles },
      { data: pendingSocialTasks },
      { data: pendingReferralTasks },
      { data: recentUsers },
      { data: recentTransactions },
      { data: pendingFundraisings },
      { data: pendingEmergencies },
      { data: adminStats },
      { data: suspiciousActivity }
    ] = await Promise.all([
      supabase.from('article_submissions').select('*, profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('social_tasks_submissions').select('*, social_tasks(task_name), profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('referral_task_submissions').select('*, referral_tasks(task_name), profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('profiles').select('user_id, full_name, email, wallet_balance, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('wallet_transactions').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(20),
      supabase.from('fundraisings').select('*, profiles(full_name, email)').eq('status', 'pending').limit(10),
      supabase.from('emergency_requests').select('*, profiles(full_name, email)').eq('status', 'pending').limit(10),
      supabase.from('admin_stats').select('*').order('stat_date', { ascending: false }).limit(7),
      supabase.rpc('get_suspicious_users')
    ]);

    const contextData = {
      pending_submissions: {
        articles: pendingArticles?.length || 0,
        social_tasks: pendingSocialTasks?.length || 0,
        referral_tasks: pendingReferralTasks?.length || 0,
        fundraisings: pendingFundraisings?.length || 0,
        emergencies: pendingEmergencies?.length || 0
      },
      recent_activity: {
        new_users_7d: recentUsers?.length || 0,
        recent_transactions: recentTransactions?.length || 0
      },
      stats: adminStats || [],
      suspicious_users: suspiciousActivity || []
    };

    const systemPrompt = `You are NaijaLancers Admin AI Assistant, an intelligent system monitoring platform health.

CAPABILITIES:
- Monitor pending submissions (articles, social tasks, referral tasks)
- Track user activity and identify suspicious patterns
- Analyze transaction flows and wallet operations
- Review fundraising and emergency requests
- Generate daily breakdowns and reports
- Flag unusual activity patterns

CURRENT PLATFORM DATA:
${JSON.stringify(contextData, null, 2)}

PENDING ITEMS DETAILS:
Articles: ${pendingArticles?.map(a => `- ${a.profiles?.full_name} submitted ${new Date(a.created_at).toLocaleString()}`).join('\n') || 'None'}

Social Tasks: ${pendingSocialTasks?.map(s => `- ${s.profiles?.full_name} for "${s.social_tasks?.task_name}" at ${new Date(s.created_at).toLocaleString()}`).join('\n') || 'None'}

Referral Tasks: ${pendingReferralTasks?.map(r => `- ${r.profiles?.full_name} for "${r.referral_tasks?.task_name}" at ${new Date(r.created_at).toLocaleString()}`).join('\n') || 'None'}

GUIDELINES:
- Provide actionable insights and specific recommendations
- Flag urgent items requiring immediate attention
- Identify trends and patterns in the data
- Be concise but comprehensive in analysis
- Suggest specific users or submissions to review
- Warn about suspicious activities or anomalies

Respond as a helpful admin assistant analyzing platform operations.`;

    const response = await fetch('https://api.lovable.dev/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        model: 'gemini-2.5-flash'
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment.',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI service credits depleted. Please top up.',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI service error');
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin AI assistant:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'AI assistant error. Please try again.',
      success: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
