import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Web search using DuckDuckGo
async function webSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await response.json();
    
    let results = '';
    if (data.Abstract) {
      results += `Summary: ${data.Abstract}\n\n`;
    }
    if (data.RelatedTopics?.length) {
      results += 'Related Information:\n';
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text) {
          results += `- ${topic.Text}\n`;
        }
      });
    }
    return results || 'No search results found.';
  } catch (error) {
    console.error('Search error:', error);
    return 'Search failed. Please try again.';
  }
}

// Detect if message needs web search
function detectSearchIntent(text: string): boolean {
  const searchIndicators = [
    'search', 'find', 'look up', 'google', 'what is', 'who is', 'when did',
    'how to', 'latest', 'current', 'today', 'news', 'price of', 'weather',
    'trending', 'recent', 'update on', '2024', '2025', 'latest news'
  ];
  const lowerText = text.toLowerCase();
  return searchIndicators.some(indicator => lowerText.includes(indicator));
}

const getSystemPrompt = (context: any, searchResults?: string) => {
  const { user, settings } = context;
  
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

  const clientModeAddition = settings?.clientMode 
    ? `\n\nCLIENT MODE ACTIVE: All responses must be client-safe and professional.`
    : '';

  const searchContext = searchResults 
    ? `\n\nWEB SEARCH RESULTS (use this information to answer):\n${searchResults}`
    : '';

  return `You are NaijaLancers Copilot - a powerful AI assistant for Nigerian freelancers with advanced capabilities.

ABOUT THE USER:
- Name: ${user?.name || 'User'}
- Profession: ${user?.profession || 'Freelancer'}
- Location: ${user?.location || 'Nigeria'}

YOUR EXPERTISE:
${expertisePrompts[settings?.expertise] || expertisePrompts['all-rounder']}

COMMUNICATION STYLE:
${toneInstructions[settings?.tone] || toneInstructions['professional']}
${clientModeAddition}

ADVANCED CAPABILITIES:
1. **Web Search**: You can search the internet for current information, news, prices, trends
2. **Image Generation**: Create logos, banners, mockups, social media graphics - just ask!
3. **Image Analysis**: Analyze uploaded images and provide feedback, descriptions, suggestions
4. **Content Generation**: Proposals, contracts, emails, blog posts, marketing copy
5. **Code Writing**: HTML, CSS, JavaScript, Python, and more
6. **Strategy**: Pricing advice, competitive analysis, business planning

SPECIAL COMMANDS (users can type these):
- "search: [query]" - Search the web for information
- "generate image: [description]" - Create an image
- "analyze this image" - Analyze an uploaded image

FREELANCING CONTEXT:
- Understand Nigerian business culture and market dynamics
- Familiar with pricing in Naira and USD
- Know common freelancing challenges in Nigeria
${searchContext}

Be helpful, proactive, and always provide actionable advice. When generating content, make it ready to use.`;
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

    // Handle web search action
    if (action === 'web_search') {
      const searchResults = await webSearch(prompt);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a helpful assistant. Use these search results to answer the user's question:\n\n${searchResults}` },
            { role: "user", content: prompt }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error("Search response generation failed");
      }

      const data = await response.json();
      return new Response(JSON.stringify({ 
        content: data.choices?.[0]?.message?.content || "No results found.",
        isSearchResult: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle image generation
    if (action === 'generate_image') {
      console.log("Generating image with prompt:", prompt);
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Image generation error:", errorText);
        return new Response(JSON.stringify({ error: "Image generation failed", details: errorText }), {
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

    // Handle image analysis
    if (action === 'analyze_image') {
      const analyzeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "user", 
              content: [
                { type: "text", text: prompt || "Analyze this image in detail. Describe what you see, provide feedback, and suggest improvements if applicable." },
                { type: "image_url", image_url: { url: attachments?.[0]?.url } }
              ]
            }
          ]
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error("Image analysis failed");
      }

      const analyzeData = await analyzeResponse.json();
      return new Response(JSON.stringify({ 
        content: analyzeData.choices?.[0]?.message?.content || "Could not analyze the image.",
        type: 'analysis'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle document/code generation (non-streaming)
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
      return new Response(JSON.stringify({ 
        content: genData.choices?.[0]?.message?.content || "",
        type: action.replace('generate_', '')
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular streaming chat with auto-detection
    let searchResults = '';
    let shouldSearch = false;
    
    // Check for explicit search command or auto-detect search intent
    if (message?.toLowerCase().startsWith('search:')) {
      const searchQuery = message.substring(7).trim();
      searchResults = await webSearch(searchQuery);
      shouldSearch = true;
    } else if (detectSearchIntent(message)) {
      searchResults = await webSearch(message);
      shouldSearch = true;
    }

    // Check for image generation request
    if (message?.toLowerCase().includes('generate image:') || 
        message?.toLowerCase().includes('create image:') ||
        message?.toLowerCase().includes('make an image') ||
        message?.toLowerCase().includes('create a logo') ||
        message?.toLowerCase().includes('design a')) {
      
      const imagePrompt = message.replace(/generate image:|create image:/i, '').trim();
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt || message }],
          modalities: ["image", "text"]
        }),
      });

      if (imageResponse.ok) {
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
    }

    const systemPrompt = getSystemPrompt(context || {
      user: { name: 'User', profession: 'Freelancer' },
      settings: { expertise: 'all-rounder', tone: 'professional', clientMode: false }
    }, shouldSearch ? searchResults : undefined);

    // Build messages array
    const messages = [{ role: "system", content: systemPrompt }];

    // Add conversation history if provided
    if (context?.conversationHistory?.length) {
      messages.push(...context.conversationHistory.slice(-10));
    }

    // Handle image attachments for vision
    if (attachments?.length) {
      const imageAttachments = attachments.filter((a: any) => a.type?.startsWith('image'));
      
      if (imageAttachments.length > 0) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: message },
            ...imageAttachments.map((img: any) => ({
              type: "image_url",
              image_url: { url: img.url }
            }))
          ]
        });
      } else {
        messages.push({ role: "user", content: message });
      }
    } else {
      messages.push({ role: "user", content: message });
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required. Please add credits to continue." }), {
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
    return new Response(JSON.stringify({ error: error.message || "Unknown error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
