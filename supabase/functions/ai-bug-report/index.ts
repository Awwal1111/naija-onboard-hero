import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { category, severity, title, description, stepsToReproduce, userContext } = await req.json();

    console.log('AI Bug Report request:', { category, severity, title });

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const categoryLabels: Record<string, string> = {
      ui: 'UI/Display Issue',
      functional: 'Feature Not Working',
      performance: 'Slow/Laggy Performance',
      mobile: 'Mobile Issue',
      other: 'Other Issue'
    };

    const severityLabels: Record<string, string> = {
      low: 'Low (Minor inconvenience)',
      medium: 'Medium (Affects usability)',
      high: 'High (Major feature broken)',
      critical: 'Critical (Cannot use platform)'
    };

    const prompt = `You are a helpful customer support AI for NaijaLancers, a Nigerian freelance platform. A user has reported a bug. Generate a professional, empathetic, and helpful response.

Bug Report Details:
- Category: ${categoryLabels[category] || category}
- Severity: ${severityLabels[severity] || severity}
- Title: ${title || 'Not provided'}
- Description: ${description}
- Steps to Reproduce: ${stepsToReproduce || 'Not provided'}
- User: ${userContext?.userName || 'Unknown User'}

Guidelines:
1. Acknowledge the issue with empathy
2. If it's critical/high severity, emphasize urgency and that the team is prioritized
3. Provide 1-2 possible workarounds if applicable (like refreshing, clearing cache, trying different browser)
4. Assure them the team will investigate
5. Keep response concise (3-5 sentences max)
6. Use friendly, professional tone
7. Do NOT promise specific timelines
8. If it sounds like the profile completion dialog issue, mention they can dismiss it by clicking outside or using the X button

Generate the response:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      'Thank you for reporting this issue. Our team has been notified and will investigate shortly.';

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('AI Bug Report error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});