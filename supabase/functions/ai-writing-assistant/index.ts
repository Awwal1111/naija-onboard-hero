import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WritingMode = 
  | 'refine_message' 
  | 'make_professional' 
  | 'make_friendly' 
  | 'make_shorter' 
  | 'make_longer'
  | 'fix_grammar'
  | 'write_bio'
  | 'write_post'
  | 'write_proposal'
  | 'write_job_description'
  | 'improve_profile'
  | 'translate_pidgin'
  | 'translate_english';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, mode, context } = await req.json() as {
      text: string;
      mode: WritingMode;
      context?: {
        profession?: string;
        industry?: string;
        tone?: string;
        targetAudience?: string;
      };
    };

    console.log('AI Writing Assistant request:', { mode, textLength: text?.length, context });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompts: Record<WritingMode, string> = {
      refine_message: `You are a professional writing assistant. Refine the following message to be clearer, more impactful, and well-structured while maintaining the original meaning and intent. Keep it natural and conversational.`,
      
      make_professional: `You are a professional writing assistant. Transform the following text into a polished, professional version suitable for business communication. Use formal language, clear structure, and confident tone.`,
      
      make_friendly: `You are a friendly writing assistant. Transform the following text into a warm, approachable, and conversational tone while keeping the core message. Add personality and warmth.`,
      
      make_shorter: `You are a concise writing assistant. Condense the following text to be shorter and more impactful. Remove unnecessary words while preserving the key message. Aim for 50% reduction.`,
      
      make_longer: `You are an expansive writing assistant. Expand the following text with more detail, examples, and context. Add relevant information that strengthens the message.`,
      
      fix_grammar: `You are a grammar expert. Fix all grammar, spelling, and punctuation errors in the following text. Keep the original meaning and style intact. Only correct errors, don't rewrite.`,
      
      write_bio: `You are a professional bio writer. Create a compelling professional biography based on the following information. The bio should be:
- 2-3 sentences long
- Highlight key skills and experience
- Sound confident but not boastful
- Include a personal touch
${context?.profession ? `Profession: ${context.profession}` : ''}
${context?.industry ? `Industry: ${context.industry}` : ''}`,
      
      write_post: `You are a social media content expert for professionals. Create an engaging LinkedIn-style post based on the following topic/idea. The post should:
- Start with a hook that grabs attention
- Use short paragraphs and line breaks
- Include relevant hashtags at the end
- Be authentic and add value
- Not exceed 300 words`,
      
      write_proposal: `You are an expert freelance proposal writer. Create a compelling proposal/cover letter based on the following job or context. The proposal should:
- Start with a personalized greeting
- Show understanding of the client's needs
- Highlight relevant experience
- Include a clear call to action
- Be confident but not arrogant
${context?.tone ? `Tone: ${context.tone}` : 'Professional but approachable'}`,
      
      write_job_description: `You are an expert job description writer. Create a clear and attractive job posting based on the following details. Include:
- Catchy title suggestion
- Role overview
- Key responsibilities (bullet points)
- Required skills
- Nice-to-have skills
- What you offer`,
      
      improve_profile: `You are a professional profile optimization expert. Improve the following profile section to be more compelling and engaging. Focus on:
- Clear value proposition
- Keywords for discoverability
- Professional yet personable tone
- Specific achievements when possible`,
      
      translate_pidgin: `You are a Nigerian Pidgin English translator. Translate the following text to Nigerian Pidgin English. Make it natural and authentic, the way Nigerians actually speak Pidgin. Keep the meaning intact.`,
      
      translate_english: `You are an English translator. Translate the following Nigerian Pidgin English to standard English. Keep the meaning and emotion intact while using proper English grammar.`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts.refine_message;

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
          { role: 'user', content: text }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'AI is busy. Please wait a moment and try again! 🙏',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please try again later.',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI service error');
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      result,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI writing assistant:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Something went wrong. Please try again! 😊',
      success: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
