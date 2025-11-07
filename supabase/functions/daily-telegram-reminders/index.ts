import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    console.log("Running daily Telegram reminders...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get users with Telegram linked who haven't signed in today
    const { data: usersToRemind } = await supabase
      .from("profiles")
      .select("user_id, full_name, telegram_user_id")
      .not("telegram_user_id", "is", null);

    if (!usersToRemind || usersToRemind.length === 0) {
      console.log("No users with Telegram accounts found");
      return new Response(JSON.stringify({ message: "No users to remind" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let signinReminders = 0;
    let taskReminders = 0;

    for (const user of usersToRemind) {
      try {
        // Check if user signed in today
        const { data: todaySignin } = await supabase
          .from("daily_signins")
          .select("id")
          .eq("user_id", user.user_id)
          .eq("signin_date", today.toISOString().split("T")[0])
          .single();

        // Send signin reminder if not signed in
        if (!todaySignin) {
          await supabase.functions.invoke("send-telegram-notification", {
            body: {
              user_id: user.user_id,
              message: `🌅 Good morning ${user.full_name}!\n\n` +
                `Don't forget to claim your daily signin bonus today! 💰\n\n` +
                `Visit the app and get your reward. Streak bonuses available! 🔥`
            }
          });
          signinReminders++;
        }

        // Check for available tasks
        const { count: availableTasks } = await supabase
          .from("social_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const { count: availableReferralTasks } = await supabase
          .from("referral_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const totalTasks = (availableTasks || 0) + (availableReferralTasks || 0);

        // Send task reminder if tasks available (only once per day)
        if (totalTasks > 0) {
          await supabase.functions.invoke("send-telegram-notification", {
            body: {
              user_id: user.user_id,
              message: `📋 *Tasks Available!*\n\n` +
                `There are ${totalTasks} active tasks waiting for you! 💼\n\n` +
                `Complete tasks to earn NaijaCoin and boost your earnings. 📈\n\n` +
                `Open the app and start earning now! 🚀`
            }
          });
          taskReminders++;
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        // Continue with other users
      }
    }

    console.log(`Sent ${signinReminders} signin reminders and ${taskReminders} task reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        signinReminders,
        taskReminders,
        totalUsers: usersToRemind.length
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in daily reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
