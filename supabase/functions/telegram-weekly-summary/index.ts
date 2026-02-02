import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[WEEKLY_SUMMARY] Starting weekly summary generation...");
    
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    // Get all users with Telegram linked
    const { data: telegramUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, telegram_user_id, wallet_balance, connections_count, is_expert, rating_count, average_rating")
      .not("telegram_user_id", "is", null);

    if (usersError) {
      throw usersError;
    }

    console.log(`[WEEKLY_SUMMARY] Found ${telegramUsers?.length || 0} users with Telegram linked`);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of telegramUsers || []) {
      try {
        // Get weekly stats

        // 1. Total messages this week
        const { count: weekMessages } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .or(`sender_id.eq.${user.user_id},recipient_id.eq.${user.user_id}`)
          .gte("created_at", weekAgoStr);

        // 2. New connections made
        const { count: newConnections } = await supabase
          .from("connections")
          .select("*", { count: "exact", head: true })
          .or(`user1_id.eq.${user.user_id},user2_id.eq.${user.user_id}`)
          .gte("created_at", weekAgoStr);

        // 3. Profile views this week
        const { count: weekViews } = await supabase
          .from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("viewed_user_id", user.user_id)
          .gte("viewed_at", weekAgoStr);

        // 4. Posts made this week
        const { count: weekPosts } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .gte("created_at", weekAgoStr);

        // 5. Total earnings this week
        const { data: weekTransactions } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gt("amount", 0)
          .gte("created_at", weekAgoStr);

        const weekEarnings = weekTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // 6. Daily signin streak
        const { data: signins } = await supabase
          .from("daily_signins")
          .select("streak_count")
          .eq("user_id", user.user_id)
          .order("signin_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const streak = signins?.streak_count || 0;

        // 7. New ratings received (for experts)
        const { count: newRatings } = await supabase
          .from("expert_ratings")
          .select("*", { count: "exact", head: true })
          .eq("expert_id", user.user_id)
          .gte("created_at", weekAgoStr);

        // Build weekly summary message
        let message = `📊 *Weekly Summary*\n`;
        message += `_${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}_\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `👋 Hey *${user.full_name?.split(' ')[0] || 'there'}*!\n\n`;
        message += `Here's what happened this week:\n\n`;

        // Activity stats
        message += `📈 *Your Activity*\n`;
        message += `• Messages: ${weekMessages || 0}\n`;
        message += `• Posts: ${weekPosts || 0}\n`;
        message += `• New connections: ${newConnections || 0}\n`;
        message += `• Profile views: ${weekViews || 0}\n`;

        if (streak > 0) {
          message += `• Signin streak: ${streak} days 🔥\n`;
        }

        if (user.is_expert && (newRatings || 0) > 0) {
          message += `• New ratings: ${newRatings} ⭐\n`;
        }

        // Earnings summary
        if (weekEarnings > 0) {
          message += `\n💰 *Weekly Earnings*\n`;
          message += `   + NC ${weekEarnings.toLocaleString()}\n`;
        }

        // Current stats
        message += `\n📊 *Your Stats*\n`;
        message += `• Total Connections: ${user.connections_count || 0}\n`;
        message += `• Wallet Balance: NC ${(user.wallet_balance || 0).toLocaleString()}\n`;
        
        if (user.is_expert) {
          message += `• Expert Rating: ${user.average_rating?.toFixed(1) || '0.0'} ⭐ (${user.rating_count || 0} reviews)\n`;
        }

        // Tips based on activity
        message += `\n💡 *Weekly Tips*\n`;
        
        if ((weekPosts || 0) === 0) {
          message += `• Try posting content to boost your visibility!\n`;
        }
        if ((weekViews || 0) < 5) {
          message += `• Complete your profile to get more views\n`;
        }
        if ((newConnections || 0) > 3) {
          message += `• Great networking! Keep it up! 🎉\n`;
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🚀 Keep building your success on NaijaLancers!\n`;
        message += `\n_See you next week!_ ✨`;

        // Send via Telegram
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(user.telegram_user_id),
            text: message,
            parse_mode: "Markdown"
          })
        });

        if (response.ok) {
          sentCount++;
          console.log(`[WEEKLY_SUMMARY] ✅ Sent to ${user.full_name}`);
        } else {
          const error = await response.json();
          console.error(`[WEEKLY_SUMMARY] ❌ Failed for ${user.full_name}:`, error);
          errorCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (userError) {
        console.error(`[WEEKLY_SUMMARY] Error for user ${user.user_id}:`, userError);
        errorCount++;
      }
    }

    console.log(`[WEEKLY_SUMMARY] Complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        total: telegramUsers?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[WEEKLY_SUMMARY] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
