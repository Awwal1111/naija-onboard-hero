import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, userProfile } = await req.json();
    console.log('AI Assistant request:', { message, context });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
- Name: ${userProfile?.full_name || 'Guest'}
- Profession: ${userProfile?.profession || 'User'}
- Status: ${userProfile?.is_expert ? 'Verified Expert ⭐' : 'Regular User'}
- Context: ${context || 'General inquiry'}

RESPONSE GUIDELINES:
- Keep answers concise (2-4 sentences) and actionable
- Use friendly, encouraging Nigerian tone
- Provide specific steps when users need guidance
- Mention relevant sections/pages when applicable
- Be helpful about earning opportunities
- Explain wallet/payment features clearly
- Guide users on how to get started with features

Remember: You're here to help Nigerians succeed on the platform! 🇳🇬`;

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
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Please wait a moment before asking again! 🙏',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI service error');
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI assistant:', error);
    
    return new Response(JSON.stringify({ 
      error: 'I\'m having trouble right now. Try again in a moment! 😊',
      success: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});