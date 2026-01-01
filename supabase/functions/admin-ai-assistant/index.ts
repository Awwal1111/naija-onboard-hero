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
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured. Please enable Lovable AI in your project settings.');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin status from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized - please log in again');
    }

    // Add user lookup tool capability
    const tools = [
      {
        type: "function",
        function: {
          name: "lookup_user",
          description: "Look up a specific user by name or email to see their full profile, wallet balance, transaction history, and activity. Use this when admin asks about a specific user.",
          parameters: {
            type: "object",
            properties: {
              search_term: { 
                type: "string", 
                description: "User's name or email to search for" 
              }
            },
            required: ["search_term"]
          }
        }
      }
    ];

    // Check if message mentions a specific user lookup
    const userLookupMatch = message.match(/(?:look up|check|find|show me|what about|details for|info on|information about|earnings? (?:of|for)|profile (?:of|for))\s+(?:user\s+)?["']?([^"'\n]+?)["']?(?:\s|$|,|\?)/i);
    
    let specificUserData = null;
    if (userLookupMatch) {
      const searchTerm = userLookupMatch[1].trim();
      console.log('Looking up user:', searchTerm);
      
      // Search by name or email
      const { data: foundUsers, error: searchError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          phone_number,
          wallet_balance,
          balance_withdrawable,
          balance_non_withdrawable,
          is_expert,
          is_premium,
          created_at,
          referral_code,
          connections_count
        `)
        .or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (foundUsers && foundUsers.length > 0) {
        // Get transaction history for each found user
        const userDetails = await Promise.all(foundUsers.map(async (u) => {
          const { data: transactions } = await supabase
            .from('wallet_transactions')
            .select('kind, amount, status, created_at, reference')
            .eq('user_id', u.user_id)
            .order('created_at', { ascending: false })
            .limit(20);
          
          const { data: referrals } = await supabase
            .from('referrals')
            .select('status, points_earned, created_at')
            .eq('referrer_id', u.user_id);
          
          const totalEarned = transactions?.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0) || 0;
          const totalSpent = transactions?.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) || 0;
          
          return {
            ...u,
            totalEarned,
            totalSpent,
            recentTransactions: transactions?.slice(0, 10) || [],
            referrals: {
              total: referrals?.length || 0,
              completed: referrals?.filter(r => r.status === 'completed').length || 0,
              totalPoints: referrals?.reduce((s, r) => s + (r.points_earned || 0), 0) || 0
            }
          };
        }));
        
        specificUserData = userDetails;
      }
    }

    console.log('Admin verified, fetching platform data...');

    // Gather comprehensive admin data
    const [
      { data: pendingArticles, error: articlesError },
      { data: pendingSocialTasks, error: socialError },
      { data: pendingReferralTasks, error: referralError },
      { data: recentUsers, error: usersError },
      { data: recentTransactions, error: txError },
      { data: pendingFundraisings, error: fundError },
      { data: pendingEmergencies, error: emergError },
      { data: adminStats, error: statsError },
      { data: suspiciousActivity, error: suspError }
    ] = await Promise.all([
      supabase.from('article_submissions').select('*, profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('social_tasks_submissions').select('*, social_tasks(task_name), profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('referral_submissions').select('*, referral_tasks(title), profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('profiles').select('user_id, full_name, wallet_balance, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('wallet_transactions').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('fundraisings').select('*, profiles(full_name)').eq('status', 'pending').limit(10),
      supabase.from('emergency_requests').select('*, profiles(full_name)').eq('status', 'pending').limit(10),
      supabase.from('admin_stats').select('*').order('stat_date', { ascending: false }).limit(7),
      supabase.rpc('get_suspicious_users')
    ]);

    // Log any data fetch errors (but continue)
    if (articlesError) console.log('Articles fetch warning:', articlesError.message);
    if (socialError) console.log('Social tasks fetch warning:', socialError.message);
    if (referralError) console.log('Referral tasks fetch warning:', referralError.message);

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
      suspicious_users: suspiciousActivity || [],
      specific_user_lookup: specificUserData
    };

    const systemPrompt = `You are NaijaLancers Admin AI Assistant, an intelligent system monitoring platform health.

CAPABILITIES:
- Monitor pending submissions (articles, social tasks, referral tasks)
- Track user activity and identify suspicious patterns
- Analyze transaction flows and wallet operations
- Review fundraising and emergency requests
- Generate daily breakdowns and reports
- Flag unusual activity patterns
- **LOOK UP SPECIFIC USERS** - When admin asks about a specific user, show their full profile and financial details

CURRENT PLATFORM DATA:
${JSON.stringify(contextData, null, 2)}

${specificUserData ? `
📋 USER LOOKUP RESULTS:
${JSON.stringify(specificUserData, null, 2)}
` : ''}

PENDING ITEMS DETAILS:
Articles: ${pendingArticles?.map(a => `- ${a.profiles?.full_name || 'Unknown'} submitted ${new Date(a.created_at).toLocaleString()}`).join('\n') || 'None pending'}

Social Tasks: ${pendingSocialTasks?.map(s => `- ${s.profiles?.full_name || 'Unknown'} for "${s.social_tasks?.task_name || 'Unknown task'}" at ${new Date(s.created_at).toLocaleString()}`).join('\n') || 'None pending'}

Referral Tasks: ${pendingReferralTasks?.map(r => `- ${r.profiles?.full_name || 'Unknown'} for "${r.referral_tasks?.title || 'Unknown task'}" at ${new Date(r.created_at).toLocaleString()}`).join('\n') || 'None pending'}

Recent Users: ${recentUsers?.map(u => `- ${u.full_name || 'Unknown'} joined ${new Date(u.created_at).toLocaleString()}, balance: ₦${u.wallet_balance}`).join('\n') || 'No recent users'}

GUIDELINES:
- Provide actionable insights and specific recommendations
- Flag urgent items requiring immediate attention
- Identify trends and patterns in the data
- Be concise but comprehensive in analysis
- Suggest specific users or submissions to review
- Warn about suspicious activities or anomalies
- Format responses with clear sections and bullet points
- When showing user details, include: Name, Balance (Total/Withdrawable/Non-withdrawable), Total Earned, Total Spent, Recent Transactions, Referral Stats, Expert/Premium status

USER LOOKUP TIPS:
- If the admin asks to "look up [name]" or "check [name]" or "show me [name]'s earnings", you have their full data above
- Present user financial data in a clear, organized format
- Highlight any anomalies (very high balances, frequent transactions, etc.)

Respond as a helpful admin assistant analyzing platform operations.`;

    console.log('Calling Lovable AI Gateway...');

    // FIXED: Use correct Lovable AI Gateway endpoint
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
          { role: 'user', content: message }
        ],
      }),
    });

    console.log('AI Gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits depleted. Please add funds in your Lovable workspace settings.',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received successfully');
    
    const assistantResponse = data.choices?.[0]?.message?.content || 'No response generated';

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
