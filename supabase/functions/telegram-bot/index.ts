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
    chat: { id: number };
    from?: { first_name?: string; username?: string; id: number };
    text?: string;
    photo?: Array<{ file_id: string }>;
    contact?: {
      phone_number: string;
      first_name?: string;
      last_name?: string;
      user_id?: number;
    };
  };
}

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

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = message.text?.trim() || "";
    const userName = message.from?.first_name || "User";

    // Command: /start - Link account
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        let identifier = parts[1];
        
        console.log("Received identifier:", identifier);
        
        try {
          identifier = decodeURIComponent(identifier);
        } catch (e) {
          // Already decoded
        }
        
        let userData = null;
        let lookupMethod = "";
        
        const { data: profileByRef, error: refError } = await supabase
          .from("profiles")
          .select("user_id, full_name, telegram_user_id, celo_wallet_address")
          .eq("referral_code", identifier.toUpperCase())
          .maybeSingle();
        
        console.log("Lookup by referral code:", { 
          found: !!profileByRef, 
          refError, 
          searchCode: identifier.toUpperCase(),
          telegram_user_id: profileByRef?.telegram_user_id 
        });
        
        if (profileByRef) {
          userData = profileByRef;
          lookupMethod = "referral code";
        } else if (identifier.includes("@")) {
          const { data: authUser, error: emailError } = await supabase.auth.admin.listUsers();
          const foundUser = authUser?.users?.find(u => 
            u.email?.toLowerCase() === identifier.toLowerCase()
          );
          
          if (foundUser) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_id, full_name, telegram_user_id, celo_wallet_address")
              .eq("user_id", foundUser.id)
              .maybeSingle();
            userData = profile;
            lookupMethod = "email";
          }
        }

        if (userData) {
          if (userData.telegram_user_id && userData.telegram_user_id !== userId?.toString()) {
            await sendTelegramMessage(
              chatId,
              `⚠️ This account is already linked to another Telegram account.\n\nPlease contact support if you need to change the linked account.`
            );
            return new Response("OK", { status: 200 });
          }

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              telegram_user_id: userId?.toString(),
              telegram_username: message.from?.username || null
            })
            .eq("user_id", userData.user_id);

          const welcomeMsg = `✅ *Account Linked Successfully!*\n\n` +
            `Hello ${userData.full_name || userName}! 👋\n\n` +
            `Your NaijaLancers account is now connected.\n\n` +
            `🤖 *I'm your AI assistant!* I can help you with:\n` +
            `• 💰 Check balance & transactions\n` +
            `• 📥 Deposit NaijaCoin (automated via Celo)\n` +
            `• 📤 Withdraw to your bank account\n` +
            `• 💸 Transfer NC to other users\n` +
            `• 👥 View referral stats\n` +
            `• 💬 Answer any questions\n\n` +
            `Just type your question naturally, or use:\n` +
            `/balance - Quick balance check\n` +
            `/deposit - Deposit instructions\n` +
            `/help - See all commands\n\n` +
            `Try asking me something like:\n` +
            `"How do I deposit money?" or "Show my balance"`;

          await sendTelegramMessage(chatId, welcomeMsg, true);
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ Account not found.\n\nPlease use the correct link from the NaijaLancers app.\n\nThe link should look like:\nhttps://t.me/NaijaLancersBot?start=YOUR_REFERRAL_CODE`
          );
        }
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `Welcome to NaijaLancers Bot! 👋\n\nTo link your account, use the connection link from the NaijaLancers app.`
      );
      return new Response("OK", { status: 200 });
    }

    // Handle contact sharing for phone verification
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const contactUserId = message.contact.user_id;
      
      // Verify the contact is the user's own phone number
      if (contactUserId !== userId) {
        await sendTelegramMessage(
          chatId,
          `❌ Please share your own phone number, not a contact's.`
        );
        return new Response("OK", { status: 200 });
      }

      console.log(`Phone verification for telegram user ${userId}: ${phoneNumber}`);

      // Find user by telegram_user_id
      const { data: profileData, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_verified")
        .eq("telegram_user_id", userId?.toString())
        .maybeSingle();

      if (!profileData) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Account not linked.\n\nPlease link your NaijaLancers account first using the connection link from the app.`
        );
        return new Response("OK", { status: 200 });
      }

      if (profileData.phone_verified) {
        await sendTelegramMessage(
          chatId,
          `✅ Your phone number is already verified!`
        );
        return new Response("OK", { status: 200 });
      }

      // Update profile with phone verification
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone_verified: true,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", profileData.user_id);

      if (updateError) {
        console.error("Phone verification update error:", updateError);
        await sendTelegramMessage(
          chatId,
          `❌ Failed to verify phone number. Please try again later.`
        );
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `✅ *Phone Verified Successfully!*\n\n` +
        `📱 Phone: ${phoneNumber}\n\n` +
        `You've earned the phone verification badge! 🎉\n\n` +
        `This helps build trust on the platform.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /phone - Request phone verification
    if (text === "/phone" || text.toLowerCase().includes("verify phone") || text.toLowerCase().includes("verify my phone")) {
      // Check if already linked
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("telegram_user_id", userId?.toString())
        .maybeSingle();

      if (existingProfile?.phone_verified) {
        await sendTelegramMessage(
          chatId,
          `✅ Your phone number is already verified!`
        );
        return new Response("OK", { status: 200 });
      }

      // Send request for phone number with a keyboard button
      await sendTelegramMessageWithPhoneRequest(
        chatId,
        `📱 *Phone Verification*\n\n` +
        `To verify your phone number and earn the Verified badge, please share your phone number using the button below.\n\n` +
        `🔒 Your phone number will only be used for verification purposes.`
      );
      return new Response("OK", { status: 200 });
    }

    // Find user by telegram_user_id - try both string and number formats
    const telegramUserId = userId?.toString();
    console.log("Looking up profile with telegram_user_id:", telegramUserId);
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name, wallet_balance, balance_withdrawable, celo_wallet_address, referral_code, telegram_user_id")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    console.log("Profile lookup result:", { 
      found: !!profile, 
      profileError, 
      searched_telegram_id: telegramUserId,
      profile_telegram_id: profile?.telegram_user_id 
    });

    if (!profile) {
      console.log("User not linked - requesting account connection");
      await sendTelegramMessage(
        chatId,
        `⚠️ Account not linked.\n\nPlease link your NaijaLancers account first.\n\nClick "Connect to Telegram Bot" in the NaijaLancers app and use the link provided.`
      );
      return new Response("OK", { status: 200 });
    }
    
    console.log(`User ${profile.full_name} (ID: ${profile.user_id}) is connected and authenticated`);

    // Command: /deposit - Show automated deposit instructions
    if (text === "/deposit" || text.toLowerCase().includes("how to deposit") || text.toLowerCase().includes("deposit money")) {
      await sendTelegramMessage(
        chatId,
        `💰 *Automated Deposit via Celo Blockchain*\n\n` +
        `*Your Personal Deposit Address:*\n` +
        `\`${profile.celo_wallet_address}\`\n\n` +
        `📱 *How to Deposit:*\n` +
        `1. Open your Celo wallet (Valora, MetaMask, etc.)\n` +
        `2. Send cUSD or USDT to your address above\n` +
        `3. Your NaijaCoin balance updates automatically!\n\n` +
        `⚡ *Processing Time:* Usually under 1 minute\n` +
        `💵 *Exchange Rate:* 1 cUSD/USDT = 1 NaijaCoin\n\n` +
        `🔒 Your wallet address is unique to you and secure.\n\n` +
        `Need help? Just ask me: "How do I buy cUSD?" or "What is Celo?"`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /balance - Check balance
    if (text === "/balance") {
      await sendTelegramMessage(
        chatId,
        `💳 *Your Wallet Balance*\n\n` +
        `Total Balance: ₦${profile.wallet_balance || 0} NC\n` +
        `Withdrawable: ₦${profile.balance_withdrawable || 0} NC\n\n` +
        `To deposit more, type /deposit`
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /help
    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `🤖 *NaijaLancers AI Assistant*\n\n` +
        `I'm your intelligent assistant! Ask me anything naturally, or use these quick commands:\n\n` +
        `💰 *Wallet Commands*\n` +
        `/balance - Check your balance\n` +
        `/deposit - Automated deposit guide\n` +
        `/withdraw [amount] - Request withdrawal\n` +
        `/transactions - Recent transactions\n` +
        `/stats - Earnings statistics\n\n` +
        `💸 *Other Commands*\n` +
        `/transfer [amount] [code] - Send NC\n` +
        `/referral - Referral dashboard\n\n` +
        `💬 *Natural Conversations*\n` +
        `Just ask me things like:\n` +
        `• "How do I deposit money?"\n` +
        `• "Show my wallet balance"\n` +
        `• "How do withdrawals work?"\n` +
        `• "What is Celo blockchain?"\n\n` +
        `I remember your context and wallet info!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /transactions - View recent transactions
    if (text === "/transactions") {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!transactions || transactions.length === 0) {
        await sendTelegramMessage(chatId, `📜 No transactions found.`);
        return new Response("OK", { status: 200 });
      }

      let message = `📜 *Recent Transactions (Last 10)*\n\n`;
      transactions.forEach((tx, i) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        const type = tx.type.toUpperCase();
        const amount = tx.amount;
        const status = tx.status;
        message += `${i + 1}. ${type} - ₦${amount} NC\n   Status: ${status}\n   Date: ${date}\n\n`;
      });

      await sendTelegramMessage(chatId, message, true);
      return new Response("OK", { status: 200 });
    }

    // Command: /withdraw [amount] - Request withdrawal
    if (text.startsWith("/withdraw")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(
          chatId,
          `❌ Please specify amount.\n\nUsage: /withdraw [amount]\nExample: /withdraw 500`
        );
        return new Response("OK", { status: 200 });
      }

      const amount = parseFloat(parts[1]);
      if (isNaN(amount) || amount < 100) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid amount. Minimum withdrawal is ₦100 NC.`
        );
        return new Response("OK", { status: 200 });
      }

      if (amount > (profile.balance_withdrawable || 0)) {
        await sendTelegramMessage(
          chatId,
          `❌ Insufficient withdrawable balance.\n\nYour withdrawable balance: ₦${profile.balance_withdrawable || 0} NC\nRequested: ₦${amount} NC`
        );
        return new Response("OK", { status: 200 });
      }

      // Create withdrawal request
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: profile.user_id,
          amount: amount,
          status: "pending"
        });

      if (error) {
        await sendTelegramMessage(
          chatId,
          `❌ Failed to create withdrawal request. Please try again later.`
        );
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `✅ *Withdrawal Request Submitted*\n\nAmount: ₦${amount} NC\nStatus: Pending Review\n\nYour request will be processed by our admin team shortly. You'll receive a notification once approved.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /referral - View referral dashboard
    if (text === "/referral") {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", profile.user_id)
        .single();

      const { count: referralCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", profileData?.referral_code);

      const { data: referralEarnings } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", profile.user_id)
        .eq("type", "referral_bonus");

      const totalEarnings = referralEarnings?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

      await sendTelegramMessage(
        chatId,
        `👥 *Referral Dashboard*\n\n` +
        `Your Referral Code: \`${profileData?.referral_code}\`\n\n` +
        `📊 *Statistics*\n` +
        `Total Referrals: ${referralCount || 0}\n` +
        `Total Earnings: ₦${totalEarnings} NC\n\n` +
        `Share your code with friends and earn rewards when they sign up!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /stats - View earnings statistics
    if (text === "/stats") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: dailyTx } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", profile.user_id)
        .gte("created_at", today.toISOString())
        .in("type", ["job_payment", "task_completion", "referral_bonus", "daily_signin"]);

      const { data: weeklyTx } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", profile.user_id)
        .gte("created_at", weekAgo.toISOString())
        .in("type", ["job_payment", "task_completion", "referral_bonus", "daily_signin"]);

      const { data: monthlyTx } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", profile.user_id)
        .gte("created_at", monthAgo.toISOString())
        .in("type", ["job_payment", "task_completion", "referral_bonus", "daily_signin"]);

      const dailyTotal = dailyTx?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
      const weeklyTotal = weeklyTx?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
      const monthlyTotal = monthlyTx?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

      await sendTelegramMessage(
        chatId,
        `📊 *Earnings Statistics*\n\n` +
        `Today: ₦${dailyTotal} NC\n` +
        `Last 7 Days: ₦${weeklyTotal} NC\n` +
        `Last 30 Days: ₦${monthlyTotal} NC\n\n` +
        `Keep earning more by completing tasks and jobs!`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /transfer [amount] [code] - Send NC to another user
    if (text.startsWith("/transfer")) {
      const parts = text.split(" ");
      if (parts.length < 3) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid format.\n\nUsage: /transfer [amount] [referral_code]\nExample: /transfer 100 ABC123`
        );
        return new Response("OK", { status: 200 });
      }

      const amount = parseFloat(parts[1]);
      const recipientCode = parts[2].toUpperCase();

      if (isNaN(amount) || amount <= 0) {
        await sendTelegramMessage(chatId, `❌ Invalid amount.`);
        return new Response("OK", { status: 200 });
      }

      if (amount > (profile.balance_withdrawable || 0)) {
        await sendTelegramMessage(
          chatId,
          `❌ Insufficient balance.\n\nYour withdrawable balance: ₦${profile.balance_withdrawable || 0} NC`
        );
        return new Response("OK", { status: 200 });
      }

      // Find recipient
      const { data: recipient } = await supabase
        .from("profiles")
        .select("user_id, full_name, referral_code")
        .eq("referral_code", recipientCode)
        .single();

      if (!recipient) {
        await sendTelegramMessage(
          chatId,
          `❌ Recipient not found with code: ${recipientCode}`
        );
        return new Response("OK", { status: 200 });
      }

      if (recipient.user_id === profile.user_id) {
        await sendTelegramMessage(chatId, `❌ You cannot transfer to yourself.`);
        return new Response("OK", { status: 200 });
      }

      // Deduct from sender
      const { error: deductError } = await supabase
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0) - amount,
          balance_withdrawable: (profile.balance_withdrawable || 0) - amount
        })
        .eq("user_id", profile.user_id);

      if (deductError) {
        await sendTelegramMessage(chatId, `❌ Transfer failed. Please try again.`);
        return new Response("OK", { status: 200 });
      }

      // Add to recipient
      await supabase.rpc("increment_wallet_balance", {
        user_id: recipient.user_id,
        amount: amount
      });

      // Record transactions
      await supabase.from("transactions").insert([
        {
          user_id: profile.user_id,
          type: "transfer_out",
          amount: -amount,
          description: `Transfer to ${recipient.full_name}`,
          status: "completed"
        },
        {
          user_id: recipient.user_id,
          type: "transfer_in",
          amount: amount,
          description: `Transfer from ${profile.full_name}`,
          status: "completed"
        }
      ]);

      await sendTelegramMessage(
        chatId,
        `✅ *Transfer Successful*\n\nAmount: ₦${amount} NC\nRecipient: ${recipient.full_name}\nNew Balance: ₦${(profile.wallet_balance || 0) - amount} NC`,
        true
      );

      // Notify recipient if they have telegram linked
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("telegram_user_id")
        .eq("user_id", recipient.user_id)
        .single();

      if (recipientProfile?.telegram_user_id) {
        await sendTelegramMessage(
          parseInt(recipientProfile.telegram_user_id),
          `💰 You received ₦${amount} NC from ${profile.full_name}!`
        );
      }

      return new Response("OK", { status: 200 });
    }

    // AI-Powered Natural Conversation Handler
    // Handle any other message as a natural language query to AI
    if (text && !text.startsWith("/")) {
      try {
        // Get recent transaction history for context
        const { data: recentTx } = await supabase
          .from("transactions")
          .select("type, amount, created_at, status")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Build context for AI
        const userContext = `
User Profile:
- Name: ${profile.full_name}
- Wallet Balance: ₦${profile.wallet_balance || 0} NC
- Withdrawable Balance: ₦${profile.balance_withdrawable || 0} NC
- Wallet Address: ${profile.celo_wallet_address}
- Referral Code: ${profile.referral_code}

Recent Transactions: ${recentTx && recentTx.length > 0 
  ? recentTx.map(tx => `${tx.type}: ₦${tx.amount} (${tx.status})`).join(", ")
  : "No recent transactions"}

Platform: NaijaLancers - Nigerian freelancing and earning platform
Deposit Method: Automated via Celo blockchain (send cUSD/USDT to wallet address)
Withdrawal: Request via /withdraw command, processed to Nigerian bank accounts
`;

        const systemPrompt = `You are the NaijaLancers AI assistant on Telegram. You help users with:
- Wallet operations (deposits, withdrawals, transfers, balance checks)
- Understanding Celo blockchain deposits (cUSD/USDT)
- Referral program information
- Platform guidance

Key Information:
- Deposits: Users send cUSD or USDT to their unique Celo wallet address - automatic & instant
- Withdrawals: Minimum ₦100 NC, processed to Nigerian bank accounts by admin team
- NaijaCoin (NC): Platform currency, 1:1 with Naira
- No manual deposits - everything is automated via blockchain

Be friendly, concise, and helpful. Use emojis appropriately. If asked about deposits, always mention their wallet address. If asked about balance, include both total and withdrawable amounts.

User Context:
${userContext}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiMessage = aiData.choices?.[0]?.message?.content || "I'm having trouble understanding. Please try again or use /help for available commands.";
          
          await sendTelegramMessage(chatId, aiMessage);
        } else {
          // Fallback if AI fails
          await sendTelegramMessage(
            chatId,
            `I'm here to help! 🤖\n\nTry asking:\n• "How do I deposit?"\n• "What's my balance?"\n• "How do withdrawals work?"\n\nOr use /help for all commands.`
          );
        }
        
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("AI conversation error:", error);
        await sendTelegramMessage(
          chatId,
          `Sorry, I encountered an error. Please try /help for available commands.`
        );
        return new Response("OK", { status: 200 });
      }
    }

    // Command: /support [message] - Contact admin
    if (text.startsWith("/support")) {
      const message = text.replace("/support", "").trim();
      if (!message) {
        await sendTelegramMessage(
          chatId,
          `❌ Please include your message.\n\nUsage: /support [your message]\nExample: /support I need help with my withdrawal`
        );
        return new Response("OK", { status: 200 });
      }

      // Create support ticket (you can create a support_tickets table or use notifications)
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: profile.user_id,
          title: "Support Request from Telegram",
          message: message,
          type: "support",
          metadata: { source: "telegram", telegram_username: userName }
        });

      if (error) {
        await sendTelegramMessage(
          chatId,
          `❌ Failed to send support request. Please try again later.`
        );
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `✅ *Support Request Sent*\n\nYour message has been forwarded to our admin team. We'll get back to you as soon as possible.\n\nThank you for your patience! 🙏`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Admin Commands (check if user is admin first)
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("user_id", profile.user_id)
      .single();

    const isAdmin = adminProfile?.user_role === "admin";

    // Command: /admin_deposits - View pending deposits (admin only)
    if (text === "/admin_deposits" && isAdmin) {
      const { data: pendingDeposits } = await supabase
        .from("manual_deposits")
        .select(`
          id,
          amount_claimed,
          created_at,
          telegram_username,
          proof_url,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!pendingDeposits || pendingDeposits.length === 0) {
        await sendTelegramMessage(chatId, `✅ No pending deposits.`);
        return new Response("OK", { status: 200 });
      }

      let message = `🔔 *Pending Deposits*\n\n`;
      pendingDeposits.forEach((dep: any, i: number) => {
        const date = new Date(dep.created_at).toLocaleDateString();
        message += `${i + 1}. ${dep.profiles.full_name} (@${dep.telegram_username})\n`;
        message += `   Amount: ₦${dep.amount_claimed} NC\n`;
        message += `   Date: ${date}\n`;
        message += `   ID: \`${dep.id}\`\n`;
        message += `   Proof: ${dep.proof_url || 'No proof'}\n\n`;
      });

      message += `\nUse /admin_approve [ID] or /admin_reject [ID]`;
      await sendTelegramMessage(chatId, message, true);
      return new Response("OK", { status: 200 });
    }

    // Command: /admin_approve [deposit_id] - Approve deposit (admin only)
    if (text.startsWith("/admin_approve") && isAdmin) {
      const depositId = text.split(" ")[1];
      if (!depositId) {
        await sendTelegramMessage(chatId, `❌ Please provide deposit ID.\n\nUsage: /admin_approve [deposit_id]`);
        return new Response("OK", { status: 200 });
      }

      const { data: deposit } = await supabase
        .from("manual_deposits")
        .select("*, profiles!inner(full_name, telegram_user_id)")
        .eq("id", depositId)
        .single();

      if (!deposit) {
        await sendTelegramMessage(chatId, `❌ Deposit not found.`);
        return new Response("OK", { status: 200 });
      }

      // Update deposit status
      await supabase
        .from("manual_deposits")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", depositId);

      // Credit user wallet
      await supabase.rpc("increment_wallet_balance", {
        user_id: deposit.user_id,
        amount: deposit.amount_claimed
      });

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: deposit.user_id,
        type: "deposit",
        amount: deposit.amount_claimed,
        description: "Manual deposit via Telegram",
        status: "completed"
      });

      await sendTelegramMessage(
        chatId,
        `✅ Deposit approved!\n\nUser: ${deposit.profiles.full_name}\nAmount: ₦${deposit.amount_claimed} NC`
      );

      // Notify user
      if (deposit.profiles.telegram_user_id) {
        await sendTelegramMessage(
          parseInt(deposit.profiles.telegram_user_id),
          `✅ Your deposit of ₦${deposit.amount_claimed} NC has been approved! 🎉\n\nYour new balance is updated. Thank you!`
        );
      }

      return new Response("OK", { status: 200 });
    }

    // Command: /admin_reject [deposit_id] - Reject deposit (admin only)
    if (text.startsWith("/admin_reject") && isAdmin) {
      const depositId = text.split(" ")[1];
      if (!depositId) {
        await sendTelegramMessage(chatId, `❌ Please provide deposit ID.\n\nUsage: /admin_reject [deposit_id]`);
        return new Response("OK", { status: 200 });
      }

      const { data: deposit } = await supabase
        .from("manual_deposits")
        .select("*, profiles!inner(full_name, telegram_user_id)")
        .eq("id", depositId)
        .single();

      if (!deposit) {
        await sendTelegramMessage(chatId, `❌ Deposit not found.`);
        return new Response("OK", { status: 200 });
      }

      // Update deposit status
      await supabase
        .from("manual_deposits")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", depositId);

      await sendTelegramMessage(
        chatId,
        `❌ Deposit rejected.\n\nUser: ${deposit.profiles.full_name}\nAmount: ₦${deposit.amount_claimed} NC`
      );

      // Notify user
      if (deposit.profiles.telegram_user_id) {
        await sendTelegramMessage(
          parseInt(deposit.profiles.telegram_user_id),
          `❌ Your deposit request of ₦${deposit.amount_claimed} NC was rejected.\n\nPlease contact support if you believe this was an error.`
        );
      }

      return new Response("OK", { status: 200 });
    }

    // Command: /admin_withdrawals - View pending withdrawals (admin only)
    if (text === "/admin_withdrawals" && isAdmin) {
      const { data: pendingWithdrawals } = await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          amount,
          created_at,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
        await sendTelegramMessage(chatId, `✅ No pending withdrawals.`);
        return new Response("OK", { status: 200 });
      }

      let message = `💸 *Pending Withdrawals*\n\n`;
      pendingWithdrawals.forEach((wd: any, i: number) => {
        const date = new Date(wd.created_at).toLocaleDateString();
        message += `${i + 1}. ${wd.profiles.full_name}\n`;
        message += `   Amount: ₦${wd.amount} NC\n`;
        message += `   Date: ${date}\n`;
        message += `   ID: \`${wd.id}\`\n\n`;
      });

      message += `\nProcess these in the admin dashboard.`;
      await sendTelegramMessage(chatId, message, true);
      return new Response("OK", { status: 200 });
    }

    // Command: /admin_broadcast [message] - Send message to all users (admin only)
    if (text.startsWith("/admin_broadcast") && isAdmin) {
      const broadcastMsg = text.replace("/admin_broadcast", "").trim();
      if (!broadcastMsg) {
        await sendTelegramMessage(chatId, `❌ Please include message.\n\nUsage: /admin_broadcast [message]`);
        return new Response("OK", { status: 200 });
      }

      const { data: users } = await supabase
        .from("profiles")
        .select("telegram_user_id")
        .not("telegram_user_id", "is", null);

      if (!users || users.length === 0) {
        await sendTelegramMessage(chatId, `❌ No users with linked Telegram accounts.`);
        return new Response("OK", { status: 200 });
      }

      let successCount = 0;
      for (const user of users) {
        try {
          await sendTelegramMessage(
            parseInt(user.telegram_user_id!),
            `📢 *Admin Announcement*\n\n${broadcastMsg}`,
            true
          );
          successCount++;
        } catch (e) {
          console.error(`Failed to send to ${user.telegram_user_id}:`, e);
        }
      }

      await sendTelegramMessage(
        chatId,
        `✅ Broadcast sent to ${successCount}/${users.length} users.`
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /admin_stats - View admin statistics (admin only)
    if (text === "/admin_stats" && isAdmin) {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: linkedTelegram } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("telegram_user_id", "is", null);

      const { count: pendingDeposits } = await supabase
        .from("manual_deposits")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: pendingWithdrawals } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      await sendTelegramMessage(
        chatId,
        `📊 *Admin Statistics*\n\n` +
        `Total Users: ${totalUsers || 0}\n` +
        `Telegram Linked: ${linkedTelegram || 0}\n` +
        `Pending Deposits: ${pendingDeposits || 0}\n` +
        `Pending Withdrawals: ${pendingWithdrawals || 0}\n\n` +
        `Use /admin_deposits or /admin_withdrawals for details.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Check if user sent a photo (proof of payment)
    if (message.photo && message.photo.length > 0) {
      const fileId = message.photo[message.photo.length - 1].file_id;
      
      // Get file URL from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileData = await fileResponse.json();
      
      if (fileData.ok) {
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
        
        // Check if there's a pending deposit request for this user
        const { data: pendingDeposit } = await supabase
          .from("manual_deposits")
          .select("id, amount_claimed")
          .eq("user_id", profile.user_id)
          .eq("status", "awaiting_proof")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (pendingDeposit) {
          // Update with proof
          await supabase
            .from("manual_deposits")
            .update({
              proof_url: fileUrl,
              status: "pending"
            })
            .eq("id", pendingDeposit.id);

          await sendTelegramMessage(
            chatId,
            `✅ *Proof received!*\n\nYour deposit request for ₦${pendingDeposit.amount_claimed} NC has been submitted to our admin team for review.\n\nYou'll receive a notification once it's approved.\n\nThank you! 🎉`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `Please first tell me how much you deposited.\n\nExample: Send "500" for ₦500`
          );
        }
      }
      return new Response("OK", { status: 200 });
    }

    // Check if user sent an amount
    const amount = parseFloat(text);
    if (!isNaN(amount) && amount > 0) {
      // Create deposit request awaiting proof
      const { error } = await supabase
        .from("manual_deposits")
        .insert({
          user_id: profile.user_id,
          telegram_user_id: userId?.toString(),
          telegram_username: message.from?.username || null,
          amount_claimed: amount,
          status: "awaiting_proof"
        });

      if (error) {
        console.error("Error creating deposit:", error);
        await sendTelegramMessage(
          chatId,
          `❌ Sorry, there was an error processing your request. Please try again later.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `✅ Amount received: ₦${amount} NC\n\nNow please send a screenshot of your payment proof.`
        );
      }
      return new Response("OK", { status: 200 });
    }

    // Default response
    await sendTelegramMessage(
      chatId,
      `Hi ${profile.full_name || userName}! 👋\n\nI didn't understand that command.\n\nType /help to see available commands.`
    );

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Telegram update:", error);
    return new Response("OK", { status: 200 });
  }
});

async function sendTelegramMessage(chatId: number, text: string, markdown = false) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: markdown ? "Markdown" : undefined
      })
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}

async function sendTelegramMessageWithPhoneRequest(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            [{ text: "📱 Share Phone Number", request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      })
    });
  } catch (error) {
    console.error("Error sending Telegram phone request message:", error);
  }
}