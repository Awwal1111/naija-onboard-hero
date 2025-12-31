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
    const { answers } = await req.json();
    
    console.log('Received answers:', answers);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Map answers to readable format
    const experienceMap: Record<string, string> = {
      'none': 'complete beginner with no digital skills',
      'basic': 'basic level, knows fundamentals',
      'intermediate': 'intermediate with some experience',
      'advanced': 'advanced and looking to specialize'
    };

    const workTypeMap: Record<string, string> = {
      'creative': 'creative work like design and video',
      'technical': 'technical work like coding and websites',
      'marketing': 'marketing and business growth',
      'support': 'administrative and support services'
    };

    const goalMap: Record<string, string> = {
      'side-income': 'earn extra income on the side',
      'full-time': 'build a full-time freelance career',
      'business': 'improve skills for their business',
      'job': 'get a better job'
    };

    const toolsMap: Record<string, string> = {
      'phone': 'only a smartphone',
      'laptop': 'laptop/computer with internet',
      'software': 'computer with design/editing software',
      'full': 'full professional setup'
    };

    const prompt = `You are a career advisor for Nigerian freelancers. Based on these assessment answers, recommend the best learning path.

User Profile:
- Experience: ${experienceMap[answers[1]] || 'not specified'}
- Interest: ${workTypeMap[answers[2]] || 'not specified'}
- Weekly learning time: ${answers[3] || '10'} hours
- Goal: ${goalMap[answers[4]] || 'not specified'}
- Available tools: ${toolsMap[answers[5]] || 'laptop'}

Available skill paths (use exact IDs):
- web-development: For HTML, CSS, JavaScript, React, WordPress
- mobile-development: For Flutter, React Native mobile apps
- graphic-design: For Canva, Photoshop, UI/UX, logo design
- digital-marketing: For social media, SEO, Google Ads
- writing: For copywriting, content writing, blogging
- video-editing: For video production, TikTok, YouTube content
- data-analysis: For Excel, Python, SQL, analytics
- virtual-assistant: For admin tasks, project management

Respond in this exact JSON format:
{
  "recommendedPath": "[exact path ID from above]",
  "skills": ["skill1", "skill2", "skill3"],
  "resources": ["course title 1", "course title 2", "course title 3"],
  "explanation": "[2-3 sentence explanation of why this path suits them, mentioning Nigerian market demand]"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful career advisor. Always respond with valid JSON only, no markdown or explanation outside the JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log('AI response content:', content);

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return fallback
      result = {
        recommendedPath: 'web-development',
        skills: ['HTML/CSS', 'JavaScript', 'React'],
        resources: ['HTML & CSS Full Course', 'JavaScript Full Course', 'React JS Full Course'],
        explanation: 'Based on your interests, web development offers great opportunities in Nigeria\'s growing tech ecosystem. Start with fundamentals and progress to React for modern applications.'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in learn-assessment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        // Return fallback data so the feature still works
        recommendedPath: 'digital-marketing',
        skills: ['Social Media Marketing', 'SEO', 'Content Marketing'],
        resources: ['Social Media Marketing Full Course', 'SEO Full Course', 'Content Writing Masterclass'],
        explanation: 'Digital marketing is one of the most in-demand skills in Nigeria right now. You can start earning quickly with social media management.'
      }),
      { 
        status: error instanceof Error && error.message.includes('Rate limit') ? 429 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
