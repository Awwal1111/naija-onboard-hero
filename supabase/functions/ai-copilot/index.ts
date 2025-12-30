import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

// Web search using Perplexity (with DuckDuckGo fallback)
async function webSearch(query: string): Promise<string> {
  // Try Perplexity first if available
  if (PERPLEXITY_API_KEY) {
    try {
      console.log("Using Perplexity for search:", query);
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: "Be precise and concise. Provide factual, up-to-date information with sources when available." },
            { role: "user", content: query }
          ],
          max_tokens: 1024
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return `[Perplexity Search Result]\n${content}`;
        }
      }
    } catch (error) {
      console.error("Perplexity search error:", error);
    }
  }

  // Fallback to DuckDuckGo
  try {
    console.log("Using DuckDuckGo fallback for search:", query);
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
    console.error('DuckDuckGo search error:', error);
    return 'Search failed. Please try again.';
  }
}

// Scrape website using Firecrawl
async function scrapeWebsite(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    return "Website scraping is not available. Please connect Firecrawl.";
  }

  try {
    console.log("Scraping website with Firecrawl:", url);
    
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl error:", errorText);
      return `Failed to scrape website: ${response.status}`;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown;
    
    if (markdown) {
      // Truncate if too long
      const truncated = markdown.length > 4000 ? markdown.substring(0, 4000) + '...' : markdown;
      return `[Scraped from ${formattedUrl}]\n\n${truncated}`;
    }
    
    return "Could not extract content from the website.";
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    return `Scraping failed: ${error.message}`;
  }
}

// Generate speech using ElevenLabs
async function generateSpeech(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log("ElevenLabs API key not configured");
    return null;
  }

  try {
    console.log("Generating speech with ElevenLabs");
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.substring(0, 2500), // ElevenLabs limit
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs error:", await response.text());
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return null;
  }
}

// Detect intents
function detectSearchIntent(text: string): boolean {
  const searchIndicators = [
    'search', 'find', 'look up', 'google', 'what is', 'who is', 'when did',
    'how to', 'latest', 'current', 'today', 'news', 'price of', 'weather',
    'trending', 'recent', 'update on', '2024', '2025', 'latest news'
  ];
  const lowerText = text.toLowerCase();
  return searchIndicators.some(indicator => lowerText.includes(indicator));
}

function detectScrapeIntent(text: string): { shouldScrape: boolean; url: string | null } {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('scrape:') || lowerText.includes('scrape ')) {
    const urlMatch = text.match(/(?:scrape:?\s*)?(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/i);
    if (urlMatch) {
      return { shouldScrape: true, url: urlMatch[1] };
    }
  }
  
  if (lowerText.includes('summarize this website') || lowerText.includes('what does this website say') || lowerText.includes('read this page')) {
    const urlMatch = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (urlMatch) {
      return { shouldScrape: true, url: urlMatch[1] };
    }
  }
  
  return { shouldScrape: false, url: null };
}

function detectSpeechIntent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes('read this') || lowerText.includes('speak this') || 
         lowerText.includes('say this') || lowerText.includes('read aloud') ||
         lowerText.includes('text to speech') || lowerText.includes('tts:');
}

const getSystemPrompt = (context: any, searchResults?: string, scrapeResults?: string) => {
  const { user, settings } = context;
  
  const expertisePrompts: Record<string, string> = {
    'designer': 'You specialize in visual design, UI/UX, branding, logos, and creative assets.',
    'writer': 'You specialize in content creation, copywriting, blog posts, marketing emails, SEO content.',
    'developer': 'You specialize in coding, web development, app prototypes, scripts, and technical solutions.',
    'marketer': 'You specialize in marketing strategy, social media content, ad copy, SEO, analytics.',
    'all-rounder': 'You are a versatile assistant skilled in design, writing, development, and marketing.'
  };

  const toneInstructions: Record<string, string> = {
    'casual': 'Be friendly, relaxed, and conversational.',
    'professional': 'Be helpful, clear, and business-appropriate.',
    'formal': 'Be precise, structured, and formal.',
    'creative': 'Be imaginative, inspiring, and unconventional.'
  };

  const clientModeAddition = settings?.clientMode 
    ? `\n\nCLIENT MODE ACTIVE: All responses must be client-safe and professional.`
    : '';

  let additionalContext = '';
  if (searchResults) {
    additionalContext += `\n\nWEB SEARCH RESULTS:\n${searchResults}`;
  }
  if (scrapeResults) {
    additionalContext += `\n\nSCRAPED WEBSITE CONTENT:\n${scrapeResults}`;
  }

  return `You are NaijaLancers Copilot - a powerful AI assistant for Nigerian freelancers.

ABOUT THE USER:
- Name: ${user?.name || 'User'}
- Profession: ${user?.profession || 'Freelancer'}

YOUR EXPERTISE:
${expertisePrompts[settings?.expertise] || expertisePrompts['all-rounder']}

COMMUNICATION STYLE:
${toneInstructions[settings?.tone] || toneInstructions['professional']}
${clientModeAddition}

CAPABILITIES:
1. Web Search (Perplexity) - Search for current information
2. Image Generation - Create logos, banners, graphics
3. Image Analysis - Analyze uploaded images
4. Website Scraping (Firecrawl) - Extract content from websites
5. Text-to-Speech (ElevenLabs) - Convert text to audio
6. Content Generation - Proposals, emails, code, documents

COMMANDS:
- "search: [query]" - Web search
- "generate image: [description]" - Create image
- "scrape: [url]" - Scrape website content
- "tts: [text]" or "read this" - Text to speech
${additionalContext}

Be helpful and provide actionable advice for Nigerian freelancers.`;
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

    // Handle text-to-speech action
    if (action === 'text_to_speech') {
      const audioUrl = await generateSpeech(prompt);
      if (audioUrl) {
        return new Response(JSON.stringify({ 
          audioUrl,
          success: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ 
        error: "Text-to-speech failed or not configured",
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            { role: "system", content: `Summarize and present these search results clearly:\n\n${searchResults}` },
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
        isSearchResult: true,
        searchProvider: PERPLEXITY_API_KEY ? 'Perplexity' : 'DuckDuckGo'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle website scraping action
    if (action === 'scrape_website') {
      const scrapeResults = await scrapeWebsite(prompt);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `Summarize this scraped website content clearly and concisely:\n\n${scrapeResults}` },
            { role: "user", content: `Summarize the key points from this website: ${prompt}` }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error("Scrape summary generation failed");
      }

      const data = await response.json();
      return new Response(JSON.stringify({ 
        content: data.choices?.[0]?.message?.content || "Could not summarize the website.",
        isScrapeResult: true
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
                { type: "text", text: prompt || "Analyze this image in detail." },
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

    // Regular streaming chat with auto-detection
    let searchResults = '';
    let scrapeResults = '';
    let shouldSearch = false;
    let shouldScrape = false;
    
    // Check for explicit commands or auto-detect intents
    if (message?.toLowerCase().startsWith('search:')) {
      const searchQuery = message.substring(7).trim();
      searchResults = await webSearch(searchQuery);
      shouldSearch = true;
    } else if (message?.toLowerCase().startsWith('scrape:')) {
      const url = message.substring(7).trim();
      scrapeResults = await scrapeWebsite(url);
      shouldScrape = true;
    } else if (detectSearchIntent(message)) {
      searchResults = await webSearch(message);
      shouldSearch = true;
    } else {
      const scrapeIntent = detectScrapeIntent(message);
      if (scrapeIntent.shouldScrape && scrapeIntent.url) {
        scrapeResults = await scrapeWebsite(scrapeIntent.url);
        shouldScrape = true;
      }
    }

    // Check for TTS request
    if (detectSpeechIntent(message)) {
      const textToSpeak = message.replace(/tts:|read this|speak this|say this|read aloud|text to speech/gi, '').trim();
      const audioUrl = await generateSpeech(textToSpeak || message);
      if (audioUrl) {
        return new Response(JSON.stringify({ 
          content: "🔊 Audio generated! Click play to listen.",
          audioUrl,
          type: 'tts'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    const systemPrompt = getSystemPrompt(
      context || { user: { name: 'User', profession: 'Freelancer' }, settings: { expertise: 'all-rounder', tone: 'professional' } },
      shouldSearch ? searchResults : undefined,
      shouldScrape ? scrapeResults : undefined
    );

    const messages = [{ role: "system", content: systemPrompt }];

    if (context?.conversationHistory?.length) {
      messages.push(...context.conversationHistory.slice(-10));
    }

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
