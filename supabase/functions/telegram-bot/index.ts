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
    from?: { first_name?: string; last_name?: string; username?: string; id: number };
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
    const lastName = message.from?.last_name || "";

    // ===========================================
    // SIGNUP COMMAND: /signup [email] [password]
    // ===========================================
    if (text.startsWith("/signup")) {
      const parts = text.split(" ");
      if (parts.length < 3) {
        await sendTelegramMessage(
          chatId,
          `📝 *Sign Up for NaijaLancers*\n\n` +
          `To create an account, use:\n` +
          `/signup your@email.com YourPassword123\n\n` +
          `*Password Requirements:*\n` +
          `• At least 8 characters\n` +
          `• One uppercase letter\n` +
          `• One lowercase letter\n` +
          `• One number\n\n` +
          `Example:\n` +
          `/signup john@example.com @Secure123`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      const email = parts[1].toLowerCase();
      const password = parts.slice(2).join(" ");

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid email format.\n\nPlease use a valid email address.`
        );
        return new Response("OK", { status: 200 });
      }

      // Validate password
      if (password.length < 8) {
        await sendTelegramMessage(
          chatId,
          `❌ Password too short.\n\nPassword must be at least 8 characters.`
        );
        return new Response("OK", { status: 200 });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const exists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email);
      
      if (exists) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Account already exists with this email.\n\n` +
          `Please use /login to link your existing account, or use a different email.`
        );
        return new Response("OK", { status: 200 });
      }

      // Create the user
      const fullName = `${userName} ${lastName}`.trim() || "NaijaLancers User";
      
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since they're using Telegram
        user_metadata: {
          full_name: fullName,
          telegram_user_id: userId?.toString(),
          telegram_username: message.from?.username
        }
      });

      if (signUpError) {
        console.error("Signup error:", signUpError);
        await sendTelegramMessage(
          chatId,
          `❌ Failed to create account.\n\n${signUpError.message}`
        );
        return new Response("OK", { status: 200 });
      }

      // Link telegram to the new profile
      if (newUser?.user) {
        await supabase
          .from("profiles")
          .update({
            telegram_user_id: userId?.toString(),
            telegram_username: message.from?.username || null,
            full_name: fullName
          })
          .eq("user_id", newUser.user.id);
      }

      await sendTelegramMessage(
        chatId,
        `🎉 *Account Created Successfully!*\n\n` +
        `Welcome to NaijaLancers, ${fullName}!\n\n` +
        `📧 Email: ${email}\n` +
        `🔗 Telegram: Already linked!\n` +
        `💰 Signup Bonus: ₦50 NC credited!\n\n` +
        `*What you can do now:*\n` +
        `• /balance - Check your wallet\n` +
        `• /deposit - Add funds\n` +
        `• /help - See all commands\n\n` +
        `💡 You can also log in on the web app:\n` +
        `https://naijalancers.com/login`,
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
          `🔗 *Link Your Existing Account*\n\n` +
          `To link your NaijaLancers account:\n` +
          `/login your@email.com\n\n` +
          `A verification code will be sent to your email.`,
          true
        );
        return new Response("OK", { status: 200 });
      }

      const email = parts[1].toLowerCase();
      
      // Find user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const foundUser = users?.users?.find(u => u.email?.toLowerCase() === email);

      if (!foundUser) {
        await sendTelegramMessage(
          chatId,
          `❌ No account found with this email.\n\n` +
          `Use /signup to create a new account.`
        );
        return new Response("OK", { status: 200 });
      }

      // Check if already linked to another telegram
      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_user_id, full_name")
        .eq("user_id", foundUser.id)
        .maybeSingle();

      if (profile?.telegram_user_id && profile.telegram_user_id !== userId?.toString()) {
        await sendTelegramMessage(
          chatId,
          `⚠️ This account is linked to another Telegram account.\n\n` +
          `Please contact support if you need help.`
        );
        return new Response("OK", { status: 200 });
      }

      // Generate and store verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await supabase
        .from("telegram_link_codes")
        .upsert({
          email,
          code: verificationCode,
          telegram_user_id: userId?.toString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
        }, { onConflict: 'email' });

      // Send email with code (using send-notification edge function)
      await supabase.functions.invoke('send-notification', {
        body: {
          to: email,
          subject: 'NaijaLancers - Telegram Link Verification',
          type: 'general',
          html: `
            <h2>Link Your Telegram Account</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb;">${verificationCode}</h1>
            <p>Enter this code in Telegram to complete the linking process.</p>
            <p>This code expires in 10 minutes.</p>
          `
        }
      });

      await sendTelegramMessage(
        chatId,
        `📧 *Verification Code Sent*\n\n` +
        `A 6-digit code has been sent to:\n${email}\n\n` +
        `Reply with:\n/verify ${verificationCode.slice(0, 2)}XXXX\n\n` +
        `(Replace XXXX with the actual digits)`,
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
        await sendTelegramMessage(
          chatId,
          `Please provide the verification code:\n/verify 123456`
        );
        return new Response("OK", { status: 200 });
      }

      const code = parts[1];
      
      // Find and validate code
      const { data: linkData } = await supabase
        .from("telegram_link_codes")
        .select("*")
        .eq("code", code)
        .eq("telegram_user_id", userId?.toString())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!linkData) {
        await sendTelegramMessage(
          chatId,
          `❌ Invalid or expired code.\n\nPlease try /login again.`
        );
        return new Response("OK", { status: 200 });
      }

      // Find user and link telegram
      const { data: users } = await supabase.auth.admin.listUsers();
      const foundUser = users?.users?.find(u => u.email?.toLowerCase() === linkData.email);

      if (!foundUser) {
        await sendTelegramMessage(chatId, `❌ Account not found.`);
        return new Response("OK", { status: 200 });
      }

      // Update profile with telegram info
      await supabase
        .from("profiles")
        .update({
          telegram_user_id: userId?.toString(),
          telegram_username: message.from?.username || null
        })
        .eq("user_id", foundUser.id);

      // Delete used code
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
        `✅ *Account Linked Successfully!*\n\n` +
        `Welcome back, ${profile?.full_name || userName}!\n\n` +
        `💰 Balance: ₦${profile?.wallet_balance || 0} NC\n\n` +
        `You can now manage your account via Telegram.\n` +
        `Type /help to see all commands.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // START COMMAND (legacy link via referral code)
    // ===========================================
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
        
        const { data: profileByRef } = await supabase
          .from("profiles")
          .select("user_id, full_name, telegram_user_id, celo_wallet_address")
          .eq("referral_code", identifier.toUpperCase())
          .maybeSingle();
        
        if (profileByRef) {
          userData = profileByRef;
        } else if (identifier.includes("@")) {
          const { data: authUser } = await supabase.auth.admin.listUsers();
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
          }
        }

        if (userData) {
          if (userData.telegram_user_id && userData.telegram_user_id !== userId?.toString()) {
            await sendTelegramMessage(
              chatId,
              `⚠️ This account is already linked to another Telegram account.`
            );
            return new Response("OK", { status: 200 });
          }

          await supabase
            .from("profiles")
            .update({
              telegram_user_id: userId?.toString(),
              telegram_username: message.from?.username || null
            })
            .eq("user_id", userData.user_id);

          await sendTelegramMessage(
            chatId,
            `✅ *Account Linked Successfully!*\n\n` +
            `Hello ${userData.full_name || userName}! 👋\n\n` +
            `Your NaijaLancers account is now connected.\n\n` +
            `🤖 *I'm your AI assistant!* I can help you with:\n` +
            `• 💰 Check balance & transactions\n` +
            `• 📥 Deposit NaijaCoin\n` +
            `• 📤 Withdraw to bank account\n` +
            `• 💸 Transfer NC to other users\n` +
            `• 👥 View referral stats\n` +
            `• 💬 Answer any questions\n\n` +
            `Type /help to see all commands`,
            true
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ Account not found with that code.\n\n` +
            `Please use:\n` +
            `• /signup - Create new account\n` +
            `• /login - Link existing account`
          );
        }
        return new Response("OK", { status: 200 });
      }

      // Welcome message for fresh /start
      await sendTelegramMessage(
        chatId,
        `👋 *Welcome to NaijaLancers Bot!*\n\n` +
        `I'm your AI assistant for managing your NaijaLancers account.\n\n` +
        `🆕 *New User?*\n` +
        `/signup email password - Create account\n\n` +
        `🔗 *Have an account?*\n` +
        `/login email - Link your account\n\n` +
        `📱 *Or visit the web app:*\n` +
        `https://naijalancers.com\n\n` +
        `Type /help for more commands.`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Handle contact sharing for phone verification
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const contactUserId = message.contact.user_id;
      
      if (contactUserId !== userId) {
        await sendTelegramMessage(
          chatId,
          `❌ Please share your own phone number, not a contact's.`
        );
        return new Response("OK", { status: 200 });
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone_verified")
        .eq("telegram_user_id", userId?.toString())
        .maybeSingle();

      if (!profileData) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Account not linked.\n\nPlease use /signup or /login first.`
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
        `✅ *Phone Verified Successfully!*\n\n` +
        `📱 Phone: ${phoneNumber}\n\n` +
        `You've earned the phone verification badge! 🎉`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // Phone verification command
    if (text === "/phone" || text.toLowerCase().includes("verify phone")) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("telegram_user_id", userId?.toString())
        .maybeSingle();

      if (!existingProfile) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Please link your account first using /login or /signup`
        );
        return new Response("OK", { status: 200 });
      }

      if (existingProfile.phone_verified) {
        await sendTelegramMessage(
          chatId,
          `✅ Your phone number is already verified!`
        );
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessageWithPhoneRequest(
        chatId,
        `📱 *Phone Verification*\n\n` +
        `Share your phone number using the button below to verify and earn a badge.\n\n` +
        `🔒 Your phone number is kept secure.`
      );
      return new Response("OK", { status: 200 });
    }

    // Find user by telegram_user_id for all other commands
    const telegramUserId = userId?.toString();
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, wallet_balance, balance_withdrawable, celo_wallet_address, referral_code, telegram_user_id")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (!profile) {
      await sendTelegramMessage(
        chatId,
        `⚠️ *Account Not Linked*\n\n` +
        `Please link your NaijaLancers account first:\n\n` +
        `🆕 New user: /signup email password\n` +
        `🔗 Existing: /login email\n\n` +
        `Or visit https://naijalancers.com to get started!`,
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
        `*Your Personal Deposit Address:*\n` +
        `\`${profile.celo_wallet_address || 'Not yet generated'}\`\n\n` +
        `📱 *How to Deposit:*\n` +
        `1. Send cUSD, USDT, or CELO to the address above\n` +
        `2. Balance updates automatically in ~1 minute\n\n` +
        `💵 *Exchange Rate:* 1 cUSD/USDT ≈ 1 NC\n\n` +
        `💡 Tip: Use the QuidaxRamp in the app for easier deposits with card/bank transfer.`,
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
        `💳 *Your Wallet Balance*\n\n` +
        `💰 Total: ₦${profile.wallet_balance || 0} NC\n` +
        `🏦 Withdrawable: ₦${profile.balance_withdrawable || 0} NC\n\n` +
        `To add funds: /deposit\n` +
        `To withdraw: /withdraw [amount]`,
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
        `🤖 *NaijaLancers Bot Commands*\n\n` +
        `*🔐 Account*\n` +
        `/signup [email] [password] - Create account\n` +
        `/login [email] - Link existing account\n` +
        `/phone - Verify phone number\n\n` +
        `*💰 Wallet*\n` +
        `/balance - Check balance\n` +
        `/deposit - Deposit instructions\n` +
        `/withdraw [amount] - Request withdrawal\n` +
        `/transactions - Recent transactions\n\n` +
        `*💸 Transfers*\n` +
        `/transfer [amount] [code] - Send NC\n\n` +
        `*👥 Social*\n` +
        `/referral - Referral dashboard\n` +
        `/stats - Earnings statistics\n\n` +
        `*💬 AI Chat*\n` +
        `Just type any question naturally!\n\n` +
        `📱 Web App: https://naijalancers.com`,
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
        msg += `${i + 1}. ${kind}\n   ₦${amount} NC | ${date}\n\n`;
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
        await sendTelegramMessage(
          chatId,
          `Usage: /withdraw [amount]\nExample: /withdraw 500\n\nMinimum: ₦100 NC`
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
          `❌ Insufficient balance.\n\nWithdrawable: ₦${profile.balance_withdrawable || 0} NC\nRequested: ₦${amount} NC`
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
        await sendTelegramMessage(
          chatId,
          `❌ Failed to create withdrawal request. Try again later.`
        );
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        chatId,
        `✅ *Withdrawal Request Submitted*\n\nAmount: ₦${amount} NC\nStatus: Pending\n\nYou'll be notified once processed.`,
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
        `Your Code: \`${profile.referral_code}\`\n\n` +
        `📊 Total Referrals: ${referralCount || 0}\n\n` +
        `Share your code to earn rewards when friends sign up!`,
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
        `📊 *Your Statistics*\n\n` +
        `💰 Total Earnings: ₦${profile_data?.total_earnings || 0} NC\n` +
        `✅ Completed Jobs: ${profile_data?.completed_jobs_count || 0}\n` +
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
        await sendTelegramMessage(
          chatId,
          `Usage: /transfer [amount] [recipient_code]\n\nExample: /transfer 100 ABC12345`
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
          `❌ Insufficient balance.\n\nWithdrawable: ₦${profile.balance_withdrawable || 0} NC`
        );
        return new Response("OK", { status: 200 });
      }

      const { data: recipient } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("referral_code", recipientCode)
        .maybeSingle();

      if (!recipient) {
        await sendTelegramMessage(
          chatId,
          `❌ Recipient not found.\n\nCheck the referral code and try again.`
        );
        return new Response("OK", { status: 200 });
      }

      if (recipient.user_id === profile.user_id) {
        await sendTelegramMessage(chatId, `❌ Cannot transfer to yourself.`);
        return new Response("OK", { status: 200 });
      }

      // Deduct from sender
      await supabase
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0) - amount,
          balance_withdrawable: (profile.balance_withdrawable || 0) - amount
        })
        .eq("user_id", profile.user_id);

      // Add to recipient
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

      // Log transactions
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
        `✅ *Transfer Successful*\n\n` +
        `Sent: ₦${amount} NC\n` +
        `To: ${recipient.full_name}\n\n` +
        `New Balance: ₦${(profile.wallet_balance || 0) - amount} NC`,
        true
      );
      return new Response("OK", { status: 200 });
    }

    // ===========================================
    // AI CHAT (Default for any other message)
    // ===========================================
    try {
      const aiContext = `You are NaijaLancers AI Assistant on Telegram. The user ${profile.full_name} has:
- Wallet Balance: ₦${profile.wallet_balance || 0} NC
- Withdrawable: ₦${profile.balance_withdrawable || 0} NC
- Referral Code: ${profile.referral_code}
- Celo Wallet: ${profile.celo_wallet_address || 'Not set'}

Available commands: /balance, /deposit, /withdraw, /transfer, /referral, /stats, /transactions, /help

Answer questions about NaijaLancers, freelancing, earning money, deposits, withdrawals, etc. Be helpful and concise.`;

      const aiResponse = await fetch("https://api.lovable.dev/v1/chat", {
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
          model: "gemini-2.5-flash"
        })
      });

      const aiData = await aiResponse.json();
      const reply = aiData.choices?.[0]?.message?.content || 
        "I couldn't process that. Try /help for available commands.";

      await sendTelegramMessage(chatId, reply);
    } catch (aiError) {
      console.error("AI error:", aiError);
      await sendTelegramMessage(
        chatId,
        `I couldn't understand that. Try:\n/help - See commands\n/balance - Check wallet`
      );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response("OK", { status: 200 });
  }
});

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