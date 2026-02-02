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
    console.log("[DAILY_DIGEST] Starting daily digest generation...");
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    // Get all users with Telegram linked
    const { data: telegramUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, telegram_user_id, wallet_balance")
      .not("telegram_user_id", "is", null);

    if (usersError) {
      throw usersError;
    }

    console.log(`[DAILY_DIGEST] Found ${telegramUsers?.length || 0} users with Telegram linked`);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of telegramUsers || []) {
      try {
        // Get user's activity from yesterday
        
        // 1. New messages received
        const { count: newMessages } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .neq("sender_id", user.user_id)
          .gte("created_at", yesterdayStr);

        // 2. New connection requests
        const { count: newConnections } = await supabase
          .from("connection_requests")
          .select("*", { count: "exact", head: true })
          .eq("requested_id", user.user_id)
          .eq("status", "pending")
          .gte("created_at", yesterdayStr);

        // 3. Job applications (if user has posted jobs)
        const { count: newApplications } = await supabase
          .from("job_post_applications")
          .select("*, job_posts!inner(user_id)", { count: "exact", head: true })
          .eq("job_posts.user_id", user.user_id)
          .gte("created_at", yesterdayStr);

        // 4. Profile views
        const { count: profileViews } = await supabase
          .from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("viewed_user_id", user.user_id)
          .gte("viewed_at", yesterdayStr);

        // 5. Wallet transactions
        const { data: transactions } = await supabase
          .from("wallet_transactions")
          .select("amount, kind")
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gte("created_at", yesterdayStr);

        const earnings = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0;
        const spending = transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

        // 6. New matching jobs posted
        const { count: newJobs } = await supabase
          .from("job_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "open")
          .gte("created_at", yesterdayStr);

        // Only send if there's some activity to report
        const hasActivity = (newMessages || 0) > 0 || (newConnections || 0) > 0 || 
                           (newApplications || 0) > 0 || (profileViews || 0) > 0 || 
                           earnings > 0 || spending > 0;

        if (!hasActivity && (newJobs || 0) === 0) {
          console.log(`[DAILY_DIGEST] No activity for ${user.full_name}, skipping`);
          continue;
        }

        // Build digest message
        let message = `🌅 *Good Morning, ${user.full_name?.split(' ')[0] || 'there'}!*\n\n`;
        message += `📊 *Your Daily Summary*\n`;
        message += `━━━━━━━━━━━━━━━\n\n`;

        if ((newMessages || 0) > 0) {
          message += `💬 *${newMessages} new message${newMessages > 1 ? 's' : ''}*\n`;
        }

        if ((newConnections || 0) > 0) {
          message += `🤝 *${newConnections} connection request${newConnections > 1 ? 's' : ''}*\n`;
        }

        if ((profileViews || 0) > 0) {
          message += `👀 *${profileViews} profile view${profileViews > 1 ? 's' : ''}*\n`;
        }

        if ((newApplications || 0) > 0) {
          message += `📝 *${newApplications} new job application${newApplications > 1 ? 's' : ''}*\n`;
        }

        if (earnings > 0 || spending > 0) {
          message += `\n💰 *Wallet Activity*\n`;
          if (earnings > 0) {
            message += `   📈 Earned: NC ${earnings.toLocaleString()}\n`;
          }
          if (spending > 0) {
            message += `   📉 Spent: NC ${spending.toLocaleString()}\n`;
          }
          message += `   💵 Balance: NC ${(user.wallet_balance || 0).toLocaleString()}\n`;
        }

        if ((newJobs || 0) > 0) {
          message += `\n🆕 *${newJobs} new job${newJobs > 1 ? 's' : ''} posted* - check the app!\n`;
        }

        message += `\n━━━━━━━━━━━━━━━\n`;
        message += `🚀 Open the app to take action!\n`;
        message += `\n_Have a productive day!_ ✨`;

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
          console.log(`[DAILY_DIGEST] ✅ Sent to ${user.full_name}`);
        } else {
          const error = await response.json();
          console.error(`[DAILY_DIGEST] ❌ Failed for ${user.full_name}:`, error);
          errorCount++;
        }

        // Rate limiting - wait 100ms between sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (userError) {
        console.error(`[DAILY_DIGEST] Error for user ${user.user_id}:`, userError);
        errorCount++;
      }
    }

    console.log(`[DAILY_DIGEST] Complete: ${sentCount} sent, ${errorCount} errors`);

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
    console.error("[DAILY_DIGEST] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
