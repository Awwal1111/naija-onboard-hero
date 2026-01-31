import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposalRequest {
  jobTitle: string;
  jobDescription: string;
  jobBudget?: string;
  jobSkills?: string[];
  freelancerName: string;
  freelancerProfession?: string;
  freelancerSkills?: string[];
  freelancerExperience?: string;
  tone?: 'professional' | 'friendly' | 'confident';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      jobTitle,
      jobDescription,
      jobBudget,
      jobSkills,
      freelancerName,
      freelancerProfession,
      freelancerSkills,
      freelancerExperience,
      tone = 'professional'
    }: ProposalRequest = await req.json();

    console.log('AI Proposal Writer request:', { jobTitle, freelancerName, tone });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const toneInstructions = {
      professional: 'Use a formal, business-like tone. Focus on expertise and deliverables.',
      friendly: 'Use a warm, approachable tone while maintaining professionalism. Show enthusiasm.',
      confident: 'Use a bold, assertive tone. Highlight achievements and unique value proposition.'
    };

    const systemPrompt = `You are an expert proposal writer for freelancers on NaijaLancers, Nigeria's premier freelance platform.

Your task is to write a compelling job application proposal that will help the freelancer stand out and win the job.

WRITING GUIDELINES:
1. ${toneInstructions[tone]}
2. Keep the proposal between 150-300 words
3. Structure: Hook → Understanding → Solution → Qualifications → Call to Action
4. Include specific references to the job requirements
5. Highlight relevant experience and skills
6. Show understanding of the client's needs
7. End with a clear call to action
8. Use Nigerian professional context appropriately
9. Don't use generic phrases like "I'm the perfect fit" - be specific
10. Include a suggested timeline if the job scope is clear

FORMAT:
- Start with a personalized greeting
- 2-3 short paragraphs maximum
- End with your name and a professional sign-off`;

    const userPrompt = `Write a winning proposal for this job:

JOB DETAILS:
- Title: ${jobTitle}
- Description: ${jobDescription}
${jobBudget ? `- Budget: ${jobBudget}` : ''}
${jobSkills?.length ? `- Required Skills: ${jobSkills.join(', ')}` : ''}

FREELANCER INFO:
- Name: ${freelancerName}
${freelancerProfession ? `- Profession: ${freelancerProfession}` : ''}
${freelancerSkills?.length ? `- Skills: ${freelancerSkills.join(', ')}` : ''}
${freelancerExperience ? `- Experience: ${freelancerExperience}` : ''}

Write the proposal now:`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'AI is busy. Please try again in a moment.',
          success: false
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI service unavailable. Please try again later.',
          success: false
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const proposal = data.choices[0]?.message?.content;

    if (!proposal) {
      throw new Error('No proposal generated');
    }

    console.log('Proposal generated successfully');

    return new Response(JSON.stringify({ 
      proposal,
      success: true,
      wordCount: proposal.split(/\s+/).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI proposal writer:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate proposal. Please try again.',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
