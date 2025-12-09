import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const getSystemPrompt = (context: any) => {
  const { user, settings, conversationHistory } = context;
  
  const expertisePrompts: Record<string, string> = {
    'designer': 'You specialize in visual design, UI/UX, branding, logos, and creative assets. You excel at creating mockups, design briefs, and visual concepts.',
    'writer': 'You specialize in content creation, copywriting, blog posts, marketing emails, SEO content, and professional documentation.',
    'developer': 'You specialize in coding, web development, app prototypes, scripts, and technical solutions. You can write HTML, CSS, JavaScript, Python, and more.',
    'marketer': 'You specialize in marketing strategy, social media content, ad copy, SEO, analytics, and growth strategies.',
    'all-rounder': 'You are a versatile assistant skilled in design, writing, development, and marketing. You adapt to whatever the freelancer needs.'
  };

  const toneInstructions: Record<string, string> = {
    'casual': 'Be friendly, relaxed, and conversational. Use simple language and occasional humor.',
    'professional': 'Be helpful, clear, and business-appropriate. Balance warmth with professionalism.',
    'formal': 'Be precise, structured, and formal. Use proper grammar and professional terminology.',
    'creative': 'Be imaginative, inspiring, and unconventional. Think outside the box and encourage creativity.'
  };

  const clientModeAddition = settings.clientMode 
    ? `\n\nCLIENT MODE ACTIVE: All responses must be client-safe and professional. Help draft client communications, project updates, and professional documents. Avoid informal language or anything that could seem unprofessional.`
    : '';

  return `You are NaijaLancers Copilot - a powerful AI assistant built specifically for Nigerian freelancers. You are ${user.name}'s personal freelancing partner.

ABOUT THE USER:
- Name: ${user.name}
- Profession: ${user.profession}
- Skills: ${user.skills?.join(', ') || 'Not specified'}
- Location: ${user.location || 'Nigeria'}
- Expert Status: ${user.isExpert ? 'Verified Expert' : 'Member'}

YOUR EXPERTISE:
${expertisePrompts[settings.expertise] || expertisePrompts['all-rounder']}

COMMUNICATION STYLE:
${toneInstructions[settings.tone] || toneInstructions['professional']}
${clientModeAddition}

CORE CAPABILITIES:
1. **Content Generation**: Create proposals, contracts, invoices, quotes, blog posts, marketing copy, emails, and any text content.
2. **Strategy & Planning**: Provide pricing advice, project timelines, competitive analysis, and business strategies.
3. **Client Communication**: Draft client emails, project updates, negotiation scripts, and professional responses.
4. **Problem Solving**: Help with freelancing challenges, difficult clients, project management, and time optimization.
5. **Image Generation**: When asked to create images, logos, or visuals, you can generate them.
6. **Code Assistance**: Write code snippets, debug issues, and explain technical concepts.

FREELANCING CONTEXT:
- Understand Nigerian business culture and market dynamics
- Know common freelancing platforms (Upwork, Fiverr, local Nigerian platforms)
- Familiar with pricing in Naira and USD
- Understand common freelancing challenges in Nigeria (payments, internet, power)

RESPONSE GUIDELINES:
- Be actionable and specific - freelancers need practical help
- Provide templates and examples when relevant
- Consider the Nigerian context in your advice
- If unsure, ask clarifying questions
- For complex requests, break down into steps
- Always be encouraging and supportive

When generating content like proposals, emails, or documents:
- Format them professionally
- Make them ready to use (not just templates)
- Personalize based on the user's profile

IMPORTANT: Never fabricate information about the user that wasn't provided. If you need more context, ask.

Start conversations warmly and be proactive in understanding what help the freelancer needs.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, action, prompt, context, attachments } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle image generation
    if (action === 'generate_image') {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: prompt }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Image generation error:", errorText);
        return new Response(JSON.stringify({ error: "Image generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const content = imageData.choices?.[0]?.message?.content || "Here's your generated image!";

      return new Response(JSON.stringify({ 
        content,
        mediaUrl: imageUrl,
        type: 'image'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle document/code generation (non-streaming for structured output)
    if (action === 'generate_document' || action === 'generate_code') {
      const genResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: action === 'generate_code' 
                ? "You are an expert programmer. Generate clean, well-commented, production-ready code."
                : "You are a professional document writer. Generate polished, ready-to-use professional documents."
            },
            { role: "user", content: prompt }
          ]
        }),
      });

      if (!genResponse.ok) {
        throw new Error("Content generation failed");
      }

      const genData = await genResponse.json();
      const content = genData.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ 
        content,
        type: action.replace('generate_', '')
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular streaming chat
    const systemPrompt = getSystemPrompt(context || {
      user: { name: 'User', profession: 'Freelancer' },
      settings: { expertise: 'all-rounder', tone: 'professional', clientMode: false }
    });

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history if provided
    if (context?.conversationHistory?.length) {
      messages.push(...context.conversationHistory.slice(-10));
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Handle image attachments for vision
    if (attachments?.length) {
      const lastMessage = messages[messages.length - 1];
      const imageAttachments = attachments.filter((a: any) => a.type.startsWith('image'));
      
      if (imageAttachments.length > 0) {
        lastMessage.content = [
          { type: "text", text: message },
          ...imageAttachments.map((img: any) => ({
            type: "image_url",
            image_url: { url: img.url }
          }))
        ];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI request failed");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("AI Copilot error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
