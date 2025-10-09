import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, userProfile } = await req.json();
    console.log('AI Assistant request:', { message, context, userProfile });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create context-aware system prompt
    const systemPrompt = `You are NaijaLancer AI, a smart assistant for the NaijaLancers platform - Nigeria's premier freelancing and professional networking platform.

PLATFORM CONTEXT:
- NaijaLancers connects freelancers with clients across Nigeria
- Users can post jobs, apply as experts, earn money through tasks, and network professionally
- Platform includes features like: expert applications, job posting, social media tasks, referral programs, wallet system, chat, and professional networking

USER PROFILE: ${userProfile ? JSON.stringify(userProfile) : 'Not provided'}
CURRENT CONTEXT: ${context || 'General platform assistance'}

CAPABILITIES:
1. Help users navigate the platform
2. Explain features and how to use them
3. Guide users through processes like posting jobs, applying for expert status, completing tasks
4. Provide tips for success on the platform
5. Answer questions about earnings, wallet, payments
6. Help with troubleshooting and technical issues
7. Offer personalized advice based on user's profile and goals

PERSONALITY:
- Friendly and professional Nigerian tone
- Use local context and understanding
- Be encouraging and supportive
- Provide actionable advice
- Keep responses concise but helpful
- Use emojis sparingly but appropriately

GUIDELINES:
- Always be helpful and positive
- If you don't know something specific about the platform, be honest but offer to help find the information
- Encourage users to explore platform features that could benefit them
- Provide step-by-step guidance when needed
- Use Nigerian context and language patterns naturally
- Focus on helping users succeed on the platform`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // ✅ Free Gemini model, fast and efficient
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 200, // ✅ Shorter responses for better UX
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Lovable AI Gateway Error:', errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please contact support.');
      }
      
      throw new Error(`AI Gateway Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Lovable AI Gateway response received successfully');

    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI assistant function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'I apologize, but I\'m experiencing some technical difficulties right now. Please try again in a moment, or feel free to explore the platform while I get back online! 😊',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});