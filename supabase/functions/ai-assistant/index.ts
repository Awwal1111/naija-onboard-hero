import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, userProfile } = await req.json();
    console.log('AI Assistant streaming request with', messages?.length || 0, 'messages');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Enhanced context-aware system prompt
    const systemPrompt = `You are NaijaLancer AI, an expert assistant for NaijaLancers - Nigeria's premier freelancing and professional networking platform.

PLATFORM FEATURES:
- 🎯 Expert marketplace: Connect skilled professionals with clients
- 💼 Job posting & applications: Post jobs, apply for opportunities
- 💰 Multiple earning streams: Tasks, referrals, expert services
- 🔒 SafePay escrow: Secure payment protection for both parties
- 💳 Integrated wallet: Manage earnings, withdrawals, VTU services
- 🤝 Professional networking: Build connections, share updates
- 📊 Analytics dashboard: Track earnings, performance, engagement

${userProfile ? `USER CONTEXT:
- Name: ${userProfile.full_name || 'Not set'}
- Profession: ${userProfile.profession || 'Not specified'}
- Expert Status: ${userProfile.is_expert ? '✅ Verified Expert' : '❌ Not yet an expert'}
- Wallet Balance: ₦${userProfile.wallet_balance || 0}
- Connections: ${userProfile.connections_count || 0}
` : ''}
${context ? `CURRENT PAGE: ${context}\n` : ''}
YOUR EXPERTISE:
- Navigate platform features with step-by-step guidance
- Optimize profiles for better visibility and opportunities
- Explain earning strategies and payment processes
- Troubleshoot technical issues effectively
- Provide personalized recommendations based on user goals
- Share best practices for success on the platform

COMMUNICATION STYLE:
- Professional yet warm and approachable
- Use Nigerian context naturally (local references, naira, etc.)
- Be concise but comprehensive (aim for 2-3 short paragraphs max)
- Use emojis strategically for emphasis (not excessively)
- Always end with actionable next steps when relevant
- If uncertain, be honest but offer alternative help

CRITICAL RULES:
- Keep responses focused and actionable
- Reference specific platform features when relevant
- Personalize advice using the user's profile context
- Encourage platform exploration and feature adoption
- Never make promises about earnings or guarantees`;

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
          ...messages // Send full conversation history
        ],
        stream: true,
        max_tokens: 500, // Allow longer, more helpful responses
        temperature: 0.7, // Balanced creativity and consistency
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'Too many requests! Please wait a moment before trying again. 🙏' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required',
          message: 'AI service temporarily unavailable. Our team has been notified. Please try again later! 💚' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Stream the response directly back to client
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('Error in AI assistant:', error);
    
    return new Response(JSON.stringify({ 
      error: 'server_error',
      message: 'I\'m experiencing technical difficulties right now. Please try again in a moment! 🔧',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});