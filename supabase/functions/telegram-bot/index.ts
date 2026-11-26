import { aiFetch } from "../_shared/ai-fallback.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const CELO_MASTER_WALLET = Deno.env.get("CELO_MASTER_WALLET_ADDRESS")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TelegramUpdate {
  message?: {
    chat: { id: number; type?: string; title?: string };
    from?: { first_name?: string; last_name?: string; username?: string; id: number };
    text?: string;
    photo?: Array<{ file_id: string }>;
    voice?: { file_id: string; duration: number };
    contact?: {
      phone_number: string;
      first_name?: string;
      last_name?: string;
      user_id?: number;
    };
  };
  channel_post?: {
    chat: { id: number; type?: string; title?: string };
    from?: { first_name?: string; last_name?: string; username?: string; id: number };
    text?: string;
  };
}

// Nigerian Hustler Tips
const dailyTips = [
  "💡 Start small, think big! Build your portfolio with small gigs, then scale up as you gain experience.",
  "💡 Network is net worth! Connect with other freelancers and share opportunities.",
  "💡 Learn a new skill every month. Digital skills are in high demand in Nigeria!",
  "💡 Set your rates based on value, not time. Clients pay for results!",
  "💡 Always deliver before deadline - this builds trust and repeat clients.",
  "💡 Save 20% of every earning. Financial discipline is key to success!",
  "💡 Create content showcasing your work. Let your skills market themselves!",
  "💡 Multiple income streams = financial security. Don't rely on one client!",
  "💡 Invest in good internet and tools. They pay for themselves with productivity!",
  "💡 Build relationships, not just transactions. Happy clients refer more clients!",
  "💡 Stay updated with industry trends. What's hot today may be obsolete tomorrow!",
  "💡 Time is money! Use productivity apps to manage your tasks efficiently.",
  "💡 Don't undersell yourself. Know your worth and charge accordingly!",
  "💡 Create packages for your services. It makes pricing easier for clients!",
  "💡 Always get payment upfront or use escrow. Protect your work!",
];

serve(async (req) => {
  try {
    let update: TelegramUpdate;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        console.log("Empty request body");
        return new Response("OK", { status: 200 });
      }
      update = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response("OK", { status: 200 });
    }

    console.log("Telegram update received:", JSON.stringify(update));

    // Handle channel posts with AI
    if (update.channel_post) {
      const channelPost = update.channel_post;
      const chatId = channelPost.chat.id;
      const text = channelPost.text?.trim() || "";
      const chatType = channelPost.chat.type;
      const chatTitle = channelPost.chat.title || "Channel";
      
      // Only respond to text messages in channels that mention the bot
      if (text && !text.startsWith('/')) {
        const botMentioned = text.toLowerCase().includes('@naijalancersbot') || 
                            text.toLowerCase().includes('naijalancers') ||
                            text.toLowerCase().includes('naija');
        if (botMentioned) {
          await handleChannelAI(chatId, text, chatTitle, chatType);
        }
      }
      return new Response("OK", { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const userId = message.from?.id;
    const text = message.text?.trim() || "";
    const userName = message.from?.first_name || "User";
    const lastName = message.from?.last_name || "";
    const telegramUserId = userId?.toString();

    // Handle group/supergroup messages with AI (only when mentioned)
    if ((chatType === 'group' || chatType === 'supergroup') && text && !text.startsWith('/')) {
      const botMentioned = text.toLowerCase().includes('@naijalancersbot') || 
                          text.toLowerCase().includes('naijalancers') ||
                          text.toLowerCase().includes('naija');
      
      if (botMentioned) {
        await handleChannelAI(chatId, text, message.chat.title || "Group", chatType);
      }
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // TIPS COMMAND: /tips
    // ===========================================
    if (text === "/tips") {
      const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
      await sendTelegramMessage(
        chatId,
        `🔥 *Hustler Tip of the Day*\n\n${randomTip}\n\n💪 Keep grinding on NaijaLancers!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // ASK COMMAND: /ask [question]
    // ===========================================
    if (text.startsWith("/ask")) {
      const question = text.replace("/ask", "").trim();
      if (!question) {
        await sendTelegramMessage(
          chatId,
          `❓ *Ask Me Anything*\n\n` +
          `Usage: /ask [your question]\n\n` +
          `Examples:\n` +
          `• /ask How do I start freelancing in Nigeria?\n` +
          `• /ask What skills are in demand?\n` +
          `• /ask How do I price my services?`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      await handleSmartAI(chatId, question, telegramUserId, userName, true);
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // JOBS COMMAND: /jobs [category]
    // ===========================================
    if (text.startsWith("/jobs")) {
      const category = text.replace("/jobs", "").trim().toLowerCase();
      
      let query = supabase
        .from("jobs")
        .select("id, title, budget, category, location_type, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (category) {
        query = query.ilike("category", `%${category}%`);
      }

      const { data: jobs, error } = await query;

      if (error || !jobs || jobs.length === 0) {
        await sendTelegramMessage(
          chatId,
          `📋 *No Jobs Found*\n\n` +
          (category ? `No open jobs in "${category}" category.\n\n` : `No open jobs at the moment.\n\n`) +
          `Try:\n• /jobs (all jobs)\n• /jobs design\n• /jobs writing\n• /jobs tech\n\n` +
          `💡 Visit https://naijalancers.name.ng/jobs for more!`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      let msg = `📋 *Latest Jobs${category ? ` in ${category}` : ''}*\n\n`;
      jobs.forEach((job, i) => {
        const budget = job.budget ? `₦${job.budget.toLocaleString()}` : 'Negotiable';
        msg += `${i + 1}. *${job.title}*\n`;
        msg += `   💰 ${budget} | 📍 ${job.location_type || 'Remote'}\n`;
        msg += `   🔗 naijalancers.name.ng/job/${job.id}\n\n`;
      });
      msg += `💡 Apply on the web app for the best experience!`;

      await sendTelegramMessage(chatId, msg, true);
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // GIGS COMMAND: /gigs [category]
    // ===========================================
    if (text.startsWith("/gigs")) {
      const category = text.replace("/gigs", "").trim().toLowerCase();
      
      let query = supabase
        .from("jobs_services")
        .select("id, title, price, category, delivery_days, rating")
        .eq("status", "active")
        .order("rating", { ascending: false })
        .limit(5);
      
      if (category) {
        query = query.ilike("category", `%${category}%`);
      }

      const { data: gigs, error } = await query;

      if (error || !gigs || gigs.length === 0) {
        await sendTelegramMessage(
          chatId,
          `🎯 *No Gigs Found*\n\n` +
          (category ? `No gigs in "${category}" category.\n\n` : `No active gigs at the moment.\n\n`) +
          `Try:\n• /gigs (all gigs)\n• /gigs graphics\n• /gigs writing\n• /gigs video\n\n` +
          `💡 Visit https://naijalancers.name.ng/my-gigs to create yours!`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      let msg = `🎯 *Top Gigs${category ? ` in ${category}` : ''}*\n\n`;
      gigs.forEach((gig, i) => {
        const price = gig.price ? `₦${gig.price.toLocaleString()}` : 'Contact';
        const rating = gig.rating ? `⭐ ${gig.rating.toFixed(1)}` : '';
        msg += `${i + 1}. *${gig.title}*\n`;
        msg += `   💰 ${price} | ⏱️ ${gig.delivery_days || 3} days ${rating}\n`;
        msg += `   🔗 naijalancers.name.ng/gig/${gig.id}\n\n`;
      });
      msg += `💡 Order gigs directly on the web app!`;

      await sendTelegramMessage(chatId, msg, true);
      return new Response("OK", { status: 200 });
    }

    // Account creation must happen on the secure website. Never collect passwords in Telegram.
    if (text === "/signup" || text.startsWith("/signup ")) {
      await sendTelegramMessage(
        chatId,
        `🔐 *Create your NaijaLancers account securely*\\n\\nPlease register on our website: https://naijalancers.name.ng/signup\\n\\nAfter registration, return here and use /login your@email.com to link Telegram. We will send a verification code to your email.\\n\\nNever send your password in Telegram chat.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // LOGIN/LINK COMMAND: /login [email]
    // ===========================================
    if (text.startsWith("/login")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(
          chatId,
          `🔗 *Link Your Account*\n\n` +
          `Usage: /login your@email.com\n\n` +
          `A verification code will be sent to your email.`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      const email = parts[1].toLowerCase();
      
      const { data: users } = await supabase.auth.admin.listUsers();
      const foundUser = users?.users?.find(u => u.email?.toLowerCase() === email);

      if (!foundUser) {
        await sendTelegramMessage(chatId, `❌ No account found. Register on naijalancers.name.ng, then use /login email to link Telegram.`);
        return new Response("OK", { status: 200 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_user_id, full_name")
        .eq("user_id", foundUser.id)
        .maybeSingle();

      if (profile?.telegram_user_id && profile.telegram_user_id !== telegramUserId) {
        await sendTelegramMessage(chatId, `⚠️ This account is linked to another Telegram.`);
        return new Response("OK", { status: 200 });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await supabase
        .from("telegram_link_codes")
        .upsert({
          email,
          code: verificationCode,
          telegram_user_id: telegramUserId,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }, { onConflict: 'email' });

      await supabase.functions.invoke('send-notification', {
        body: {
          to: email,
          subject: 'NaijaLancers - Telegram Verification Code',
          type: 'general',
          html: `
            <h2>Link Your Telegram Account</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb;">${verificationCode}</h1>
            <p>This code expires in 10 minutes.</p>
          `
        }
      });

      await sendTelegramMessage(
        chatId,
        `📧 *Verification Code Sent*\n\n` +
        `Check your email: ${email}\n\n` +
        `Then reply with:\n/verify [your-6-digit-code]`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // VERIFY COMMAND: /verify [code]
    // ===========================================
    if (text.startsWith("/verify")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(chatId, `Usage: /verify [6-digit-code]`);
        return new Response("OK", { status: 200 });
      }

      const code = parts[1];
      
      const { data: linkData } = await supabase
        .from("telegram_link_codes")
        .select("*")
        .eq("code", code)
        .eq("telegram_user_id", telegramUserId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!linkData) {
        await sendTelegramMessage(chatId, `❌ Invalid or expired code. Try /login again.`);
        return new Response("OK", { status: 200 });
      }

      const { data: users } = await supabase.auth.admin.listUsers();
      const foundUser = users?.users?.find(u => u.email?.toLowerCase() === linkData.email);

      if (!foundUser) {
        await sendTelegramMessage(chatId, `❌ Account not found.`);
        return new Response("OK", { status: 200 });
      }

      await supabase
        .from("profiles")
        .update({
          telegram_user_id: telegramUserId,
          telegram_username: message.from?.username || null
        })
        .eq("user_id", foundUser.id);

      await supabase
        .from("telegram_link_codes")
        .delete()
        .eq("code", code);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, wallet_balance")
        .eq("user_id", foundUser.id)
        .maybeSingle();

      await sendTelegramMessage(
        chatId,
        `✅ *Account Linked!*\n\n` +
        `Welcome back, ${profile?.full_name || userName}!\n` +
        `💰 Balance: ₦${profile?.wallet_balance || 0} NC\n\n` +
        `Type /help for all commands.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // START COMMAND: linking is only allowed through /login + email verification.
    if (text.startsWith("/start")) {
      await sendTelegramMessage(
        chatId,
        `👋 *Welcome to NaijaLancers Bot!*\\n\\nTo connect your existing account, send:\\n/login your@email.com\\n\\nA one-time verification code will be sent to your registered email.\\n\\nNew here? Create your account securely at https://naijalancers.name.ng/signup\\n\\nYou can manage Telegram notifications in Settings on the website.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Handle contact sharing for phone verification
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const contactUserId = message.contact.user_id;
      
      if (contactUserId !== userId) {
        await sendTelegramMessage(chatId, `❌ Please share your own phone number.`);
        return new Response("OK", { status: 200 });
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_verified")
        .eq("telegram_user_id", telegramUserId)
        .maybeSingle();

      if (!profileData) {
        await sendTelegramMessage(chatId, `⚠️ Please link your account first. Use /login email`);
        return new Response("OK", { status: 200 });
      }

      if (profileData.phone_verified) {
        await sendTelegramMessage(chatId, `✅ Your phone is already verified!`);
        return new Response("OK", { status: 200 });
      }

      await supabase
        .from("profiles")
        .update({
          phone_verified: true,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", profileData.user_id);

      await sendTelegramMessage(
        chatId,
        `✅ *Phone Verified!*\n\n📱 ${phoneNumber}\n\n🎉 You earned the verification badge!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Phone verification command
    if (text === "/phone" || text.toLowerCase().includes("verify phone")) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("telegram_user_id", telegramUserId)
        .maybeSingle();

      if (!existingProfile) {
        await sendTelegramMessage(chatId, `⚠️ Please link your account first. Use /login email`);
        return new Response("OK", { status: 200 });
      }

      if (existingProfile.phone_verified) {
        await sendTelegramMessage(chatId, `✅ Your phone is already verified!`);
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessageWithPhoneRequest(
        chatId,
        `📱 *Phone Verification*\n\n` +
        `Share your phone number using the button below.`
      );
      return new Response("OK", { status: 200 });
    }

    // Telegram users can opt out of alerts directly from the bot.
    if (text === "/stop" || text === "/notifications off" || text === "/notifications on") {
      const { data: linkedAccount } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("telegram_user_id", telegramUserId)
        .maybeSingle();
      if (!linkedAccount) {
        await sendTelegramMessage(chatId, "Your Telegram account is not linked. Use /login your@email.com first.");
        return new Response("OK", { status: 200 });
      }
      const enabled = text === "/notifications on";
      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: linkedAccount.user_id, telegram_enabled: enabled, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) {
        console.error("Could not update Telegram notification preference:", error);
        await sendTelegramMessage(chatId, "I couldn't update your notification setting. Please try again in Settings.");
      } else {
        await sendTelegramMessage(chatId, enabled
          ? "✅ Telegram account alerts are enabled. Send /stop any time to opt out."
          : "🔕 Telegram alerts are now disabled. Your account remains linked. Re-enable with /notifications on or in website Settings.");
      }
      return new Response("OK", { status: 200 });
    }

    // Find user by telegram_user_id for all other commands
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, wallet_balance, balance_withdrawable, celo_wallet_address, referral_code, telegram_user_id")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (!profile) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Account Not Linked*\n\n` +
        `🆕 New: register at naijalancers.name.ng/signup\n` +
        `🔗 Existing: /login email\n\n` +
        `Or visit https://naijalancers.name.ng`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // DEPOSIT COMMAND
    // ===========================================
    if (text === "/deposit" || text.toLowerCase().includes("deposit")) {
      await sendTelegramMessage(
        chatId,
        `💰 *Deposit NaijaCoin*\n\n` +
        `*Your Address:*\n\`${profile.celo_wallet_address || 'Not generated'}\`\n\n` +
        `📱 Send cUSD, USDT, or CELO\n` +
        `💵 Rate: 1 cUSD/USDT ≈ 1 NC\n\n` +
        `💡 Use QuidaxRamp in the app for easier deposits!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // BALANCE COMMAND
    // ===========================================
    if (text === "/balance") {
      await sendTelegramMessage(
        chatId,
        `💳 *Your Wallet*\n\n` +
        `💰 Total: ₦${profile.wallet_balance || 0} NC\n` +
        `🏦 Withdrawable: ₦${profile.balance_withdrawable || 0} NC`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // HELP COMMAND
    // ===========================================
    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `🤖 *NaijaLancers Bot*\n\n` +
        `*🔐 Account*\n` +
        `/signup [email] [password]\n` +
        `/login [email]\n` +
        `/phone - Verify phone\n\n` +
        `*💰 Wallet*\n` +
        `/balance | /deposit | /withdraw\n` +
        `/transactions | /transfer\n\n` +
        `*📋 Discover*\n` +
        `/jobs [category] - Find jobs\n` +
        `/gigs [category] - Browse gigs\n` +
        `/tips - Hustler tips\n\n` +
        `*💬 AI Chat*\n` +
        `/ask [question] - Ask anything\n` +
        `Or just type your question!\n\n` +
        `*👥 Social*\n` +
        `/referral | /stats`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // TRANSACTIONS COMMAND
    // ===========================================
    if (text === "/transactions") {
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!transactions || transactions.length === 0) {
        await sendTelegramMessage(chatId, `📜 No transactions found.`);
        return new Response("OK", { status: 200 });
      }

      let msg = `📜 *Recent Transactions*\n\n`;
      transactions.forEach((tx, i) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        const kind = tx.kind?.toUpperCase() || 'UNKNOWN';
        const amount = tx.amount || 0;
        msg += `${i + 1}. ${kind} | ₦${amount} NC | ${date}\n`;
      });

      await sendTelegramMessage(chatId, msg, true);
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // WITHDRAW COMMAND
    // ===========================================
    if (text.startsWith("/withdraw")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(chatId, `Usage: /withdraw [amount]\nMin: ₦100 NC`);
        return new Response("OK", { status: 200 });
      }

      const amount = parseFloat(parts[1]);
      if (isNaN(amount) || amount < 100) {
        await sendTelegramMessage(chatId, `❌ Minimum withdrawal: ₦100 NC`);
        return new Response("OK", { status: 200 });
      }

      if (amount > (profile.balance_withdrawable || 0)) {
        await sendTelegramMessage(
          chatId,
          `❌ Insufficient balance.\nWithdrawable: ₦${profile.balance_withdrawable || 0} NC`
        );
        return new Response("OK", { status: 200 });
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: profile.user_id,
          amount: amount,
          status: "pending"
        });

      if (error) {
        await sendTelegramMessage(chatId, `❌ Failed to create request. Try again.`);
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `✅ *Withdrawal Requested*\n\nAmount: ₦${amount} NC\nStatus: Pending`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // REFERRAL COMMAND
    // ===========================================
    if (text === "/referral") {
      const { count: referralCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", profile.referral_code);

      await sendTelegramMessage(
        chatId,
        `👥 *Referral Dashboard*\n\n` +
        `Your Code: \`${profile.referral_code}\`\n` +
        `📊 Referrals: ${referralCount || 0}\n\n` +
        `Share and earn rewards!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // STATS COMMAND
    // ===========================================
    if (text === "/stats") {
      const { data: profile_data } = await supabase
        .from("profiles")
        .select("total_earnings, completed_jobs_count, connections_count")
        .eq("user_id", profile.user_id)
        .single();

      await sendTelegramMessage(
        chatId,
        `📊 *Your Stats*\n\n` +
        `💰 Earnings: ₦${profile_data?.total_earnings || 0} NC\n` +
        `✅ Jobs: ${profile_data?.completed_jobs_count || 0}\n` +
        `👥 Connections: ${profile_data?.connections_count || 0}`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // TRANSFER COMMAND
    // ===========================================
    if (text.startsWith("/transfer")) {
      const parts = text.split(" ");
      if (parts.length < 3) {
        await sendTelegramMessage(chatId, `Usage: /transfer [amount] [referral_code]`);
        return new Response("OK", { status: 200 });
      }

      const amount = parseFloat(parts[1]);
      const recipientCode = parts[2].toUpperCase();

      if (isNaN(amount) || amount <= 0) {
        await sendTelegramMessage(chatId, `❌ Invalid amount.`);
        return new Response("OK", { status: 200 });
      }

      if (amount > (profile.balance_withdrawable || 0)) {
        await sendTelegramMessage(chatId, `❌ Insufficient balance.`);
        return new Response("OK", { status: 200 });
      }

      const { data: recipient } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("referral_code", recipientCode)
        .maybeSingle();

      if (!recipient) {
        await sendTelegramMessage(chatId, `❌ Recipient not found.`);
        return new Response("OK", { status: 200 });
      }

      if (recipient.user_id === profile.user_id) {
        await sendTelegramMessage(chatId, `❌ Cannot transfer to yourself.`);
        return new Response("OK", { status: 200 });
      }

      await supabase
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0) - amount,
          balance_withdrawable: (profile.balance_withdrawable || 0) - amount
        })
        .eq("user_id", profile.user_id);

      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("wallet_balance, balance_withdrawable")
        .eq("user_id", recipient.user_id)
        .single();

      await supabase
        .from("profiles")
        .update({
          wallet_balance: (recipientProfile?.wallet_balance || 0) + amount,
          balance_withdrawable: (recipientProfile?.balance_withdrawable || 0) + amount
        })
        .eq("user_id", recipient.user_id);

      await supabase.from("wallet_transactions").insert([
        {
          user_id: profile.user_id,
          kind: 'transfer_out',
          amount: -amount,
          status: 'completed',
          reference: `Transfer to ${recipient.full_name}`
        },
        {
          user_id: recipient.user_id,
          kind: 'transfer_in',
          amount: amount,
          status: 'completed',
          reference: `Transfer from ${profile.full_name}`
        }
      ]);

      await sendTelegramMessage(
        chatId,
        `✅ *Sent ₦${amount} NC to ${recipient.full_name}*\n\n` +
        `New Balance: ₦${(profile.wallet_balance || 0) - amount} NC`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // AI CHAT (Default for any other message)
    // ===========================================
    await handleSmartAI(chatId, text, telegramUserId, profile.full_name || userName, false, profile);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response("OK", { status: 200 });
  }
});

// Smart AI with conversation memory
async function handleSmartAI(
  chatId: number, 
  userMessage: string, 
  telegramUserId: string | undefined, 
  userName: string,
  isAskCommand: boolean,
  profile?: any
) {
  try {
    // Get conversation history (last 10 messages for context)
    let conversationHistory: { role: string; content: string }[] = [];
    
    if (telegramUserId) {
      const { data: history } = await supabase
        .from("telegram_conversations")
        .select("role, content")
        .eq("telegram_user_id", telegramUserId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (history) {
        conversationHistory = history.reverse().map(h => ({
          role: h.role,
          content: h.content
        }));
      }
    }

    // Build system context
    let systemContext = `You are NaijaLancers AI Assistant on Telegram. You're a smart, friendly Nigerian freelancing expert.

User: ${userName}
${profile ? `Wallet Balance: ₦${profile.wallet_balance || 0} NC
Withdrawable: ₦${profile.balance_withdrawable || 0} NC
Referral Code: ${profile.referral_code}` : 'Account not linked'}

Your personality:
- Helpful and encouraging
- Use occasional Nigerian expressions (e.g., "No wahala!", "E go better!")
- Give practical, actionable advice
- Keep responses concise but informative
- Use emojis appropriately

Available commands to mention when relevant:
/jobs - Find jobs | /gigs - Browse gigs | /tips - Get hustler tips
/balance - Check wallet | /deposit - Add funds | /withdraw - Request payout
/referral - Referral stats | /stats - Earnings stats

For account actions, guide users to use commands or visit https://naijalancers.name.ng`;

    const messages = [
      { role: "system", content: systemContext },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    const aiResponse = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        messages,
        model: "google/gemini-2.5-flash"
      })
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || 
      "I couldn't process that. Try /help for commands!";

    // Save conversation to memory
    if (telegramUserId) {
      await supabase.from("telegram_conversations").insert([
        { telegram_user_id: telegramUserId, role: "user", content: userMessage },
        { telegram_user_id: telegramUserId, role: "assistant", content: reply }
      ]);
    }

    await sendTelegramMessage(chatId, reply, true);
  } catch (aiError) {
    console.error("AI error:", aiError);
    await sendTelegramMessage(
      chatId,
      `I couldn't process that. Try /help for commands!`
    );
  }
}

async function sendTelegramMessage(chatId: number, text: string, markdown = false) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: markdown ? "Markdown" : undefined
    })
  });
}

async function sendTelegramMessageWithPhoneRequest(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [[{
          text: "📱 Share Phone Number",
          request_contact: true
        }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    })
  });
}

// Handle AI in channels and groups (when mentioned)
async function handleChannelAI(chatId: number, text: string, chatTitle: string, chatType: string | undefined) {
  try {
    const aiContext = `You are NaijaLancers AI in a Telegram ${chatType || 'channel'} called "${chatTitle}".
    
You help with:
- Freelancing tips and advice for Nigerians
- Earning opportunities online
- Career and skill development
- General questions about making money

Be helpful, use emojis, and occasionally use Nigerian expressions.
For account actions, tell users to DM @NaijaLancersBot or visit https://naijalancers.name.ng`;

    const aiResponse = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: aiContext },
          { role: "user", content: text }
        ],
        model: "google/gemini-2.5-flash"
      })
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content;

    if (reply) {
      await sendTelegramMessage(chatId, reply, true);
    }
  } catch (error) {
    console.error("Channel AI error:", error);
  }
}
