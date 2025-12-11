import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web search function using a free search API
async function webSearch(query: string): Promise<string> {
  try {
    // Use DuckDuckGo instant answer API (free, no API key needed)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    let results = [];
    
    // Get abstract if available
    if (data.Abstract) {
      results.push(`Summary: ${data.Abstract}`);
    }
    
    // Get related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: any) => t.Text)
        .slice(0, 5)
        .map((t: any) => t.Text);
      if (topics.length > 0) {
        results.push(`Related info: ${topics.join('. ')}`);
      }
    }
    
    // Get infobox if available
    if (data.Infobox && data.Infobox.content) {
      const infoItems = data.Infobox.content
        .slice(0, 5)
        .map((item: any) => `${item.label}: ${item.value}`)
        .join(', ');
      if (infoItems) {
        results.push(`Details: ${infoItems}`);
      }
    }
    
    return results.length > 0 
      ? results.join('\n\n') 
      : `No detailed results found for "${query}". I'll answer based on my knowledge.`;
  } catch (error) {
    console.error('Search error:', error);
    return `Search failed. I'll answer based on my knowledge.`;
  }
}

// Detect if user wants web search
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
    const { messages, action, imageAttachment, searchQuery } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle web search action
    if (action === "web_search" && searchQuery) {
      console.log("Performing web search for:", searchQuery);
      const searchResults = await webSearch(searchQuery);
      
      // Now use AI to summarize/respond based on search results
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
        throw new Error("Failed to generate image");
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ 
          type: "image",
          content: imageData.choices?.[0]?.message?.content || "I've generated an image for you.",
          imageUrl 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle image analysis (vision)
    if (action === "analyze_image" && imageAttachment) {
      console.log("Analyzing image...");
      
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
                  text: messages[messages.length - 1]?.content || "What do you see in this image?"
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

    // Detect if we should auto-search
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const shouldSearch = detectSearchIntent(lastUserMessage);
    
    let searchContext = '';
    if (shouldSearch) {
      console.log("Auto-detecting search intent, searching for:", lastUserMessage);
      searchContext = await webSearch(lastUserMessage);
    }

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
- Generate images when asked (just say "I'll generate that image for you" and the system will handle it)
- Search the web for current information
- Analyze images that users share
- Help with jobs, tasks, and freelancing advice
- Provide information about the NaijaLancers platform

${searchContext ? `\n\nWeb Search Results for user's query:\n${searchContext}\n\nUse this information to provide accurate, up-to-date answers.` : ''}

When users ask you to create/generate/make an image, acknowledge their request and the system will generate it automatically.
When users share images, analyze and describe them helpfully.
If users want current information (news, prices, weather, etc.), you have web search capabilities.

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
