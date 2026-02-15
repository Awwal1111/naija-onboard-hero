import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web search using Perplexity API (if available) or fallback to DuckDuckGo
async function webSearch(query: string): Promise<{ results: string; citations: string[] }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  
  // Use Perplexity if available (better quality search)
  if (PERPLEXITY_API_KEY) {
    try {
      console.log("Using Perplexity for web search:", query);
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "Be precise and concise. Provide factual information with sources." },
            { role: "user", content: query }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const citations = data.citations || [];
        return { results: content, citations };
      }
      console.log("Perplexity failed, falling back to DuckDuckGo");
    } catch (error) {
      console.error("Perplexity search error:", error);
    }
  }
  
  // Fallback to DuckDuckGo
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    let results = [];
    
    if (data.Abstract) {
      results.push(`Summary: ${data.Abstract}`);
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: any) => t.Text)
        .slice(0, 5)
        .map((t: any) => t.Text);
      if (topics.length > 0) {
        results.push(`Related info: ${topics.join('. ')}`);
      }
    }
    
    if (data.Infobox && data.Infobox.content) {
      const infoItems = data.Infobox.content
        .slice(0, 5)
        .map((item: any) => `${item.label}: ${item.value}`)
        .join(', ');
      if (infoItems) {
        results.push(`Details: ${infoItems}`);
      }
    }
    
    return { 
      results: results.length > 0 ? results.join('\n\n') : `No detailed results found for "${query}".`,
      citations: []
    };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return { results: `Search failed. I'll answer based on my knowledge.`, citations: [] };
  }
}

// Scrape website using Firecrawl
async function scrapeWebsite(url: string): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || Deno.env.get("FIRECRAWL_API_KEY_1");
  
  if (!FIRECRAWL_API_KEY) {
    return "Website scraping is not available. Firecrawl API key not configured.";
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
      const errorData = await response.text();
      console.error('Firecrawl error:', errorData);
      return `Failed to scrape website: ${response.status}`;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";
    const title = data.data?.metadata?.title || data.metadata?.title || url;
    
    // Truncate if too long
    const truncated = markdown.length > 4000 ? markdown.substring(0, 4000) + "..." : markdown;
    
    return `**Website: ${title}**\n\n${truncated}`;
  } catch (error) {
    console.error('Firecrawl error:', error);
    return `Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Generate speech with ElevenLabs
async function generateSpeech(text: string, voiceId: string = "JBFqnCBsd6RMkjVDRZzb"): Promise<string | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  
  if (!ELEVENLABS_API_KEY) {
    console.log("ElevenLabs API key not configured");
    return null;
  }
  
  try {
    console.log("Generating speech with ElevenLabs");
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.substring(0, 5000), // Limit text length
          model_id: 'eleven_turbo_v2_5',
          output_format: 'mp3_44100_128',
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binary);
    
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('ElevenLabs error:', error);
    return null;
  }
}

// Detect scrape intent
function detectScrapeIntent(text: string): string | null {
  const scrapePatterns = [
    /scrape\s+(?:the\s+)?(?:website\s+)?(?:at\s+)?(?:url\s+)?([^\s,]+\.[^\s,]+)/i,
    /(?:read|get|fetch|extract)\s+(?:content\s+from|from)\s+([^\s,]+\.[^\s,]+)/i,
    /what['']?s\s+on\s+([^\s,]+\.[^\s,]+)/i,
  ];
  
  for (const pattern of scrapePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Detect if user wants speech output
function detectSpeechIntent(text: string): boolean {
  const speechKeywords = [
    'speak', 'say', 'read aloud', 'read out', 'voice', 'audio',
    'tell me', 'say it', 'speak this', 'pronounce'
  ];
  const lowerText = text.toLowerCase();
  return speechKeywords.some(keyword => lowerText.includes(keyword));
}

// Detect search intent
function detectSearchIntent(text: string): boolean {
  const searchKeywords = [
    'search', 'find', 'look up', 'google', 'what is the latest',
    'current', 'today', 'news', 'recent', 'who is', 'what is',
    'how much', 'price of', 'weather', 'score', 'results',
    'search for', 'search online', 'find out', 'tell me about'
  ];
  const lowerText = text.toLowerCase();
  return searchKeywords.some(keyword => lowerText.includes(keyword));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, action, imageAttachment, searchQuery, generateAudio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle text-to-speech request
    if (action === "text_to_speech") {
      const text = messages[messages.length - 1]?.content || "";
      const audioUrl = await generateSpeech(text);
      
      if (!audioUrl) {
        return new Response(
          JSON.stringify({ error: "Failed to generate speech. ElevenLabs may not be configured." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ audioUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle website scraping
    if (action === "scrape_website" && searchQuery) {
      console.log("Scraping website:", searchQuery);
      const scrapedContent = await scrapeWebsite(searchQuery);
      
      // Use AI to summarize the scraped content
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are NaijaLancers AI Assistant. The user asked to scrape a website.
              
              Here is the scraped content:
              ${scrapedContent}
              
              Summarize the key information from this website in a helpful way.`
            },
            ...messages.slice(-3),
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Handle web search action
    if (action === "web_search" && searchQuery) {
      console.log("Performing web search for:", searchQuery);
      const { results: searchResults, citations } = await webSearch(searchQuery);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are NaijaLancers AI Assistant with web search capabilities. 
              The user asked: "${searchQuery}"
              
              Here are the search results:
              ${searchResults}
              
              ${citations.length > 0 ? `Sources: ${citations.join(', ')}` : ''}
              
              Provide a helpful, accurate response based on these search results. 
              If the search didn't find relevant info, say so and provide what you know.
              Be conversational and helpful.`
            },
            ...messages.slice(-5),
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Handle image generation
    if (action === "generate_image") {
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage.content;

      console.log("Generating image with prompt:", prompt);

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        if (imageResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (imageResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await imageResponse.text();
        console.error("Image generation error:", errorText);
        throw new Error("Failed to generate image");
      }

      const imageData = await imageResponse.json();
      console.log("Image response received:", JSON.stringify(imageData).substring(0, 500));
      
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const content = imageData.choices?.[0]?.message?.content || "I've generated an image for you!";

      return new Response(
        JSON.stringify({ 
          type: "image",
          content,
          imageUrl 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle image analysis (vision)
    if (action === "analyze_image" && imageAttachment) {
      console.log("Analyzing image, attachment length:", imageAttachment?.length);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are NaijaLancers AI Assistant with vision capabilities. 
              Analyze images thoroughly and provide helpful, detailed descriptions.
              Be conversational and helpful.`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: imageAttachment
                  }
                },
                {
                  type: "text",
                  text: messages[messages.length - 1]?.content || "What do you see in this image? Describe it in detail."
                }
              ]
            }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Vision API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to analyze image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Detect special intents from the last message
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Check for scrape intent
    const urlToScrape = detectScrapeIntent(lastUserMessage);
    if (urlToScrape) {
      console.log("Auto-detected scrape intent for:", urlToScrape);
      const scrapedContent = await scrapeWebsite(urlToScrape);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are NaijaLancers AI Assistant. The user asked about a website.
              
              Here is the scraped content from ${urlToScrape}:
              ${scrapedContent}
              
              Summarize and answer the user's question based on this content.`
            },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // Detect if we should auto-search
    const shouldSearch = detectSearchIntent(lastUserMessage);
    
    let searchContext = '';
    let citations: string[] = [];
    if (shouldSearch) {
      console.log("Auto-detecting search intent, searching for:", lastUserMessage);
      const searchResult = await webSearch(lastUserMessage);
      searchContext = searchResult.results;
      citations = searchResult.citations;
    }

    // Check available features
    const hasPerplexity = !!Deno.env.get("PERPLEXITY_API_KEY");
    const hasElevenLabs = !!Deno.env.get("ELEVENLABS_API_KEY");
    const hasFirecrawl = !!Deno.env.get("FIRECRAWL_API_KEY") || !!Deno.env.get("FIRECRAWL_API_KEY_1");

    // Handle streaming text conversation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are NaijaLancers AI Assistant, a powerful and helpful AI that can:
- Have natural conversations
- Generate images when asked
- Search the web for current information ${hasPerplexity ? '(powered by Perplexity AI for accurate results)' : ''}
- Analyze images that users share
${hasFirecrawl ? '- Scrape and read website content (just provide a URL!)' : ''}
${hasElevenLabs ? '- Convert text to speech (users can click the speaker icon to hear responses)' : ''}
- Help with jobs, tasks, and freelancing advice
- Provide information about the NaijaLancers platform

${searchContext ? `\n\nWeb Search Results for user's query:\n${searchContext}\n${citations.length > 0 ? `\nSources: ${citations.join(', ')}` : ''}\n\nUse this information to provide accurate, up-to-date answers.` : ''}

When users ask you to create/generate/make an image, acknowledge their request and the system will generate it automatically.
When users share images, analyze and describe them helpfully.
If users want current information (news, prices, weather, etc.), you have web search capabilities.
${hasFirecrawl ? 'If users mention a website URL, offer to scrape and summarize its content.' : ''}
${hasElevenLabs ? 'Let users know they can click the speaker icon to hear your responses read aloud.' : ''}

Keep responses concise, friendly, and professional. Use emojis sparingly.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
