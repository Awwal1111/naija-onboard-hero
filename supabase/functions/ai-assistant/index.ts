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
NaijaLancers is Nigeria's premier freelance and professional networking platform that connects skilled professionals with opportunities. The platform features:

KEY FEATURES:
- Job Marketplace: Post jobs or apply for freelance gigs across various categories
- Expert Directory: Browse and hire verified experts in different fields
- Wallet System: NaijaCoin (NC) digital wallet for payments and transactions
- SafePay Escrow: Secure payment protection for projects (buyer creates offer, seller accepts, work is completed, funds released)
- Daily Sign-in Rewards: Earn 5 NC daily for signing in
- Earning Opportunities: Complete surveys, social tasks, referral tasks, trivia games, and spin wheel games
- Professional Networking: Connect with other professionals, send connection requests
- Messaging: Chat with connected users
- Posts & Stories: Share professional updates and stories
- Expert Applications: Apply to become a verified expert in your field
- Digital Products: Sell or purchase digital products (templates, courses, etc.)
- Courses: Create and enroll in professional courses
- Fundraising: Create or contribute to fundraising campaigns
- Emergency Loans: Request emergency financial assistance
- VTU Services: Buy airtime and data bundles
- Groups: Join location-based professional groups

WALLET & PAYMENTS:
- NaijaCoin (NC) is the platform currency (1 NC ≈ 1 Naira)
- Wallet has withdrawable and non-withdrawable balances
- Deposit via Paystack (card or bank transfer)
- Withdraw funds after completing tasks/jobs
- Transfer NC to other users using their email
- Transaction PIN required for transfers
- SafePay escrow protects both buyers and sellers in transactions

EARNING METHODS:
1. Complete jobs and freelance projects
2. Daily sign-in rewards (5 NC daily)
3. Complete surveys (CPX Research integration)
4. Social media tasks (follow, like, share)
5. Referral program (earn when referrals reach 1000 NC)
6. Trivia games and spin wheel
7. Sell digital products or courses
8. Offer expert services

USER: ${userProfile?.full_name || 'Guest'} | ${userProfile?.profession || 'User'}${userProfile?.is_expert ? ' (Verified Expert)' : ''}
CONTEXT: ${context || 'General help'}

Keep responses concise (2-4 sentences), friendly, and actionable. Use Nigerian context naturally and be encouraging!`;

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