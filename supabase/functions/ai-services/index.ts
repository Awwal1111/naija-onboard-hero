import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Keys
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Web search using Perplexity (with DuckDuckGo fallback)
async function webSearch(query: string): Promise<string> {
  if (PERPLEXITY_API_KEY) {
    try {
      console.log("Using Perplexity for search:", query);
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content:
                "Be precise and concise. Provide factual, up-to-date information with sources when available.",
            },
            { role: "user", content: query },
          ],
          max_tokens: 1024,
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

    let results = "";
    if (data.Abstract) {
      results += `Summary: ${data.Abstract}\n\n`;
    }
    if (data.RelatedTopics?.length) {
      results += "Related Information:\n";
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text) {
          results += `- ${topic.Text}\n`;
        }
      });
    }
    return results || "No search results found.";
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return "Search failed. Please try again.";
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
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
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
      const truncated =
        markdown.length > 4000
          ? markdown.substring(0, 4000) + "..."
          : markdown;
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
          text: text.substring(0, 2500),
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
    const audioBase64 = base64Encode(audioBuffer);
    return `data:audio/mpeg;base64,${audioBase64}`;
  } catch (error) {
    console.error("ElevenLabs error:", error);
    return null;
  }
}

// LLM API call with Lovable/Gemini
async function callAI(
  messages: any[],
  model: string = "google/gemini-2.5-flash"
): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("AI service (LOVABLE_API_KEY) is not configured");
  }

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Please wait a moment before asking again! 🙏");
    }
    throw new Error("AI service error");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Handler for basic assistant chat
async function handleAssistantChat(
  message: string,
  userId: string,
  userProfile: any
): Promise<string> {
  const systemPrompt = `You are NaijaLancer AI, a helpful assistant for the NaijaLancers platform.

ABOUT NAIJALANCERS:
NaijaLancers is Nigeria's premier freelance and professional networking platform connecting skilled professionals with opportunities across Africa.

CORE FEATURES:

💼 JOB MARKETPLACE
- Post or apply for freelance jobs across all categories
- Browse by skill, budget, location, and deadline
- Direct messaging with clients/freelancers
- Portfolio showcase on profiles

👨‍💼 EXPERT DIRECTORY
- Apply to become a verified expert (requires admin approval)
- Browse verified experts by category and ratings
- Expert profiles show skills, experience, and reviews
- Hire experts directly from their profile

💰 WALLET SYSTEM (NaijaCoin - NC)
- Platform currency: 1 NC ≈ 1 Naira
- Two balances: Withdrawable vs Non-Withdrawable
- Deposit via Paystack (cards, bank transfer, USDT on Celo blockchain)
- Withdraw to bank account (minimum withdrawal amounts apply)
- Transfer NC to other users by email
- Transaction PIN required for all transfers/withdrawals
- Real-time transaction history and receipts

🔒 SAFEPAY ESCROW SYSTEM
- Secure payment protection for jobs/projects
- Process: Buyer creates offer → Seller accepts → Work completed → Funds released
- Protects both buyers and sellers
- Dispute resolution available

📱 VTU SERVICES (Bill Payments)
- Buy airtime for all Nigerian networks
- Purchase data bundles
- Pay for cable TV subscriptions (DStv, GOtv, Startimes)
- Pay electricity bills
- All payments via NaijaCoin wallet

🎯 EARNING OPPORTUNITIES
1. Complete freelance jobs (main income source)
2. Daily sign-in rewards (5 NC daily - check Activity Log)
3. CPX Research surveys (external survey platform)
4. Social media tasks (follow, like, share, comment)
5. Referral program (earn when referrals earn 1000 NC)
6. Nigerian trivia games (test your knowledge)
7. Spin wheel game (daily chances to win)
8. Sell digital products or online courses
9. Offer expert consulting services
10. NaijaPredictor betting game

🤝 PROFESSIONAL NETWORKING
- Send/receive connection requests
- Network with professionals in your field
- Share posts and professional updates
- Post stories (24-hour content)
- Comment and engage with community content
- Join location-based professional groups

💬 MESSAGING
- Direct messaging with connections
- Group chats for team collaboration
- Real-time online status indicators
- Message notifications

📚 DIGITAL MARKETPLACE
- Digital Products: Sell templates, graphics, ebooks, etc.
- Online Courses: Create and sell courses with lessons
- Purchase learning resources from other users

💝 FUNDRAISING & EMERGENCY LOANS
- Create fundraising campaigns with goals
- Support others' fundraising initiatives
- Request emergency loans (subject to approval)
- Community-driven financial support

👥 PROFILE & PORTFOLIO
- Complete profile setup for better visibility
- Add skills and experience
- Upload portfolio items with images
- Showcase past work to attract clients
- Expert ratings and reviews

⚙️ ACCOUNT MANAGEMENT
- Set transaction PIN for security
- Manage privacy settings
- View activity logs
- Block/unblock users
- Saved posts collection
- Notification preferences

CURRENT USER:
- Name: ${userProfile?.full_name || "Guest"}
- Profession: ${userProfile?.profession || "User"}
- Status: ${userProfile?.is_expert ? "Verified Expert ⭐" : "Regular User"}

RESPONSE GUIDELINES:
- Keep answers concise (2-4 sentences) and actionable
- Use friendly, encouraging Nigerian tone
- Provide specific steps when users need guidance
- Mention relevant sections/pages when applicable
- Be helpful about earning opportunities
- Explain wallet/payment features clearly
- Guide users on how to get started with features

Remember: You're here to help Nigerians succeed on the platform! 🇳🇬`;

  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);
}

// Handler for admin assistant
async function handleAdminAssistant(
  message: string,
  supabase: any
): Promise<string> {
  // Check for user lookup patterns
  const userLookupMatch = message.match(
    /(?:look up|check|find|show me|what about|details for|info on|information about|earnings? (?:of|for)|profile (?:of|for))\s+(?:user\s+)?["']?([^"'\n]+?)["']?(?:\s|$|,|\?)/i
  );

  let specificUserData = null;
  if (userLookupMatch) {
    const searchTerm = userLookupMatch[1].trim();
    console.log("Looking up user:", searchTerm);

    const { data: foundUsers } = await supabase
      .from("profiles")
      .select(
        `
        user_id,
        full_name,
        phone_number,
        wallet_balance,
        balance_withdrawable,
        balance_non_withdrawable,
        is_expert,
        is_premium,
        created_at,
        referral_code,
        connections_count
      `
      )
      .or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
      .limit(5);

    if (foundUsers && foundUsers.length > 0) {
      const userDetails = await Promise.all(
        foundUsers.map(async (u) => {
          const { data: transactions } = await supabase
            .from("wallet_transactions")
            .select("kind, amount, status, created_at, reference")
            .eq("user_id", u.user_id)
            .order("created_at", { ascending: false })
            .limit(20);

          const { data: referrals } = await supabase
            .from("referrals")
            .select("status, points_earned, created_at")
            .eq("referrer_id", u.user_id);

          const totalEarned =
            transactions
              ?.filter((t) => t.amount > 0)
              .reduce((s, t) => s + t.amount, 0) || 0;
          const totalSpent =
            transactions
              ?.filter((t) => t.amount < 0)
              .reduce((s, t) => s + Math.abs(t.amount), 0) || 0;

          return {
            ...u,
            totalEarned,
            totalSpent,
            recentTransactions: transactions?.slice(0, 10) || [],
            referrals: {
              total: referrals?.length || 0,
              completed:
                referrals?.filter((r) => r.status === "completed").length || 0,
              totalPoints:
                referrals?.reduce((s, r) => s + (r.points_earned || 0), 0) ||
                0,
            },
          };
        })
      );

      specificUserData = userDetails;
    }
  }

  // Gather admin data
  const [
    { data: pendingArticles },
    { data: pendingSocialTasks },
    { data: recentUsers },
    { data: recentTransactions },
    { data: pendingFundraisings },
  ] = await Promise.all([
    supabase
      .from("article_submissions")
      .select("*, profiles(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("social_tasks_progress")
      .select("*, profiles:earner_id(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("user_id, full_name, wallet_balance, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("wallet_transactions")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("fundraisings")
      .select("*, profiles(full_name)")
      .eq("status", "pending")
      .limit(5),
  ]);

  const adminContext = `
ADMIN DASHBOARD DATA:

${specificUserData ? `USER DETAILS:\n${JSON.stringify(specificUserData, null, 2)}\n\n` : ""}

PENDING ITEMS:
- Articles awaiting review: ${pendingArticles?.length || 0}
- Social tasks pending: ${pendingSocialTasks?.length || 0}
- Fundraising campaigns: ${pendingFundraisings?.length || 0}

RECENT ACTIVITY:
- New users (last 10): ${recentUsers?.length || 0}
- Transaction count (last 10): ${recentTransactions?.length || 0}
`;

  const systemPrompt = `You are the NaijaLancers Admin AI Assistant. You have access to platform data and can help administrators:
- Look up user profiles and activity
- Review pending submissions
- Analyze platform metrics
- Answer questions about user behavior
- Help manage platform content

You have administrative privileges and can see detailed user information when requested.

CURRENT ADMIN CONTEXT:
${adminContext}

Respond professionally and provide insights based on the platform data available.`;

  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);
}

// Handler for copilot/chat with search
async function handleCopilot(message: string): Promise<string> {
  const searchMatch = message.match(/search:(.+?)(?:\n|$)/i);
  const scrapeMatch = message.match(/scrape:(.+?)(?:\n|$)/i);
  const ttsMatch = message.match(/text-to-speech:(.+?)(?:\n|$)/i);

  let enrichedContext = "";

  if (searchMatch) {
    enrichedContext += "\n" + (await webSearch(searchMatch[1].trim()));
  }

  if (scrapeMatch) {
    enrichedContext += "\n" + (await scrapeWebsite(scrapeMatch[1].trim()));
  }

  const systemPrompt = `You are an advanced AI assistant with access to real-time web search, website scraping, and text-to-speech generation. 
  
You can help users with:
- General questions and information
- Web search and research
- Website content analysis
- Code assistance
- Creative writing
- Academic help
- Problem solving

When users mention "search:", "scrape:", or "text-to-speech:", process those requests appropriately.
${enrichedContext ? `\nRelevant information:\n${enrichedContext}` : ""}`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  if (ttsMatch) {
    const ttsResponse = await generateSpeech(response);
    if (ttsResponse) {
      return JSON.stringify({
        response,
        audioUrl: ttsResponse,
      });
    }
  }

  return response;
}

// Handler for bug reporting
async function handleBugReport(
  bugData: any
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const categoryLabels: Record<string, string> = {
    ui: "UI/Display Issue",
    functional: "Feature Not Working",
    performance: "Slow/Laggy Performance",
    mobile: "Mobile Issue",
    other: "Other Issue",
  };

  const severityLabels: Record<string, string> = {
    low: "Low (Minor inconvenience)",
    medium: "Medium (Affects workflow)",
    high: "High (Blocking functionality)",
    critical: "Critical (Platform down/major data loss)",
  };

  const systemPrompt = `You are a professional bug report analyzer. Generate a comprehensive technical summary of the bug report provided.

Include:
1. Bug Summary (1-2 sentences)
2. Reproduction Steps
3. Expected vs Actual Behavior
4. Potential Impact
5. Recommended Priority for Fix

Be technical but clear.`;

  const message = `
CATEGORY: ${categoryLabels[bugData.category] || bugData.category}
SEVERITY: ${severityLabels[bugData.severity] || bugData.severity}
TITLE: ${bugData.title}
DESCRIPTION: ${bugData.description}
${bugData.steps ? `REPRODUCTION STEPS: ${bugData.steps}` : ""}
${bugData.environment ? `ENVIRONMENT: ${bugData.environment}` : ""}`;

  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);
}

// Handler for content moderation
async function checkForViolations(
  content: string
): Promise<any[]> {
  const systemPrompt = `You are a content moderation AI. Analyze the provided content for violations of community guidelines.

Check for:
1. Hate speech or discrimination
2. Violence or threats
3. Sexual/adult content
4. Spam or scams
5. Misinformation
6. Copyright/IP violations

Return a JSON array of violations found, each with: {violation_type: string, severity: "low|medium|high", description: string}
If no violations, return empty array: []`;

  const response = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Content to moderate:\n${content}` },
  ]);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse moderation response:", e);
  }

  return [];
}

async function handleModeration(content: string): Promise<any> {
  const violations = await checkForViolations(content);

  if (violations.length === 0) {
    return {
      approved: true,
      violations: [],
      action: "approved",
    };
  }

  const highSeverity = violations.filter((v) => v.severity === "high").length >
    0;

  return {
    approved: false,
    violations,
    action: highSeverity ? "removed" : "flagged",
    reason: violations.map((v) => v.description).join("; "),
  };
}

// Handler for writing assistance
async function handleWritingAssistance(
  text: string,
  purpose: string
): Promise<string> {
  const purposes: Record<string, string> = {
    proofread: "Fix grammar, spelling, and punctuation",
    improve: "Improve clarity and engagement",
    professional: "Make it more professional and formal",
    creative: "Make it more creative and engaging",
    summarize: "Summarize the key points",
    expand: "Expand with more detail and examples",
  };

  const systemPrompt = `You are a professional writing assistant. Your task is to: ${purposes[purpose] || "Improve the writing quality"}

Provide suggestions and improvements while maintaining the original intent and voice of the author. Be constructive and helpful.`;

  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Please help with this text:\n\n${text}` },
  ]);
}

// Main request handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service, message, context, userProfile, ...otherData } = await req
      .json()
      .catch(() => ({}));

    // Determine service type from query params or body
    const url = new URL(req.url);
    const serviceType = service || url.searchParams.get("service") || "assistant";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");

    let supabase, userId;

    // For services that require auth
    if (
      ["assistant", "copilot", "chat", "writing"].includes(serviceType)
    ) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({
            error: "Authentication required",
            success: false,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      supabase = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth
        .getClaims(token);

      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({
            error: "Invalid or expired token",
            success: false,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = claimsData.claims.sub;
    }

    // Admin services require special verification
    if (serviceType === "admin") {
      if (!authHeader) {
        throw new Error("Authorization header missing");
      }

      supabase = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        token
      );

      if (userError || !user) {
        throw new Error("Unauthorized - admin access required");
      }

      userId = user.id;
    }

    let response: any;

    switch (serviceType) {
      case "assistant":
        response = await handleAssistantChat(message || "", userId, userProfile);
        break;

      case "admin":
        response = await handleAdminAssistant(message || "", supabase);
        break;

      case "copilot":
      case "chat":
        response = await handleCopilot(message || "");
        break;

      case "bug-report":
        response = await handleBugReport(otherData);
        break;

      case "moderation":
        response = await handleModeration(otherData.content || "");
        break;

      case "writing":
        response = await handleWritingAssistance(
          otherData.text || message || "",
          otherData.purpose || "improve"
        );
        break;

      default:
        throw new Error(
          `Unknown service type: ${serviceType}. Valid options: assistant, admin, copilot, chat, bug-report, moderation, writing`
        );
    }

    return new Response(JSON.stringify({ response, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in AI services:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
