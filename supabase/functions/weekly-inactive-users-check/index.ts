import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    console.log("[WEEKLY_CHECK] Running weekly inactive users check...");

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get users with Telegram linked who haven't signed in for 7+ days
    const { data: inactiveUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, telegram_user_id, is_expert")
      .not("telegram_user_id", "is", null);

    if (usersError) {
      throw usersError;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log("[WEEKLY_CHECK] No users with Telegram accounts found");
      return new Response(
        JSON.stringify({ message: "No users to check" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let missedYouSent = 0;
    let taskRemindersSent = 0;
    let expertOpportunitiesSent = 0;

    for (const user of inactiveUsers) {
      try {
        // Check last sign-in date
        const { data: lastSignin } = await supabase
          .from("daily_signins")
          .select("signin_date, created_at")
          .eq("user_id", user.user_id)
          .order("signin_date", { ascending: false })
          .limit(1)
          .single();

        const lastSigninDate = lastSignin ? new Date(lastSignin.signin_date) : null;
        const isInactive = !lastSigninDate || lastSigninDate < oneWeekAgo;

        if (isInactive) {
          // Send "We miss you" message
          let missYouMessage = `😔 *We miss you, ${user.full_name}!*\n\n`;
          missYouMessage += `It's been a while since we've seen you. We hope you're doing well! 🙏\n\n`;

          if (user.is_expert) {
            // Expert-specific message
            missYouMessage += `👨‍💼 *As an expert, you're missing out on:*\n\n` +
              `💼 New job opportunities from clients\n` +
              `💰 Potential earnings waiting for you\n` +
              `📩 Messages from interested clients\n` +
              `⭐ Building your reputation and ratings\n\n` +
              `🔥 Come back and check your dashboard!\n\n` +
              `Your expertise is valuable - don't let opportunities slip away! 🚀`;

            // Check for job opportunities
            const { count: jobCount } = await supabase
              .from("jobs")
              .select("*", { count: "exact", head: true })
              .eq("status", "open");

            if (jobCount && jobCount > 0) {
              expertOpportunitiesSent++;
            }
          } else {
            // Regular user message
            missYouMessage += `🎁 *What's waiting for you:*\n\n` +
              `💰 Daily sign-in bonuses (you're missing out!)\n` +
              `📋 New tasks to earn NC\n` +
              `🤝 Growing community of experts\n` +
              `🎯 New features and improvements\n\n` +
              `🔥 Come back and claim your rewards!\n\n` +
              `We've got exciting opportunities waiting for you! 🚀`;

            // Check available tasks
            const { count: tasksCount } = await supabase
              .from("social_tasks")
              .select("*", { count: "exact", head: true })
              .eq("status", "active");

            if (tasksCount && tasksCount > 0) {
              taskRemindersSent++;
            }
          }

          // Send Telegram message
          const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: parseInt(user.telegram_user_id),
                text: missYouMessage,
                parse_mode: "Markdown"
              })
            }
          );

          if (response.ok) {
            missedYouSent++;
            console.log(`[WEEKLY_CHECK] ✅ Sent "we miss you" to ${user.full_name}`);
          } else {
            const error = await response.json();
            console.error(`[WEEKLY_CHECK] ❌ Failed to send to ${user.full_name}:`, error);
          }

          // Wait a bit to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (userError) {
        console.error(`[WEEKLY_CHECK] Error processing user ${user.user_id}:`, userError);
        // Continue with other users
      }
    }

    const summary = {
      success: true,
      totalUsers: inactiveUsers.length,
      missedYouSent,
      taskRemindersSent,
      expertOpportunitiesSent,
      timestamp: new Date().toISOString()
    };

    console.log("[WEEKLY_CHECK] Summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WEEKLY_CHECK] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
