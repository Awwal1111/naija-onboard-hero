import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BANK_ACCOUNT = {
  number: "8129002732",
  bank: "Opay",
  name: "Awwal Dayyabu"
};

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string; username?: string; id: number };
    text?: string;
    photo?: Array<{ file_id: string }>;
  };
}

serve(async (req) => {
  try {
    const update: TelegramUpdate = await req.json();
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
      let identifier = parts.length > 1 ? decodeURIComponent(parts[1]) : "";
      
      // If no identifier in command, check if user is already linked
      if (!identifier) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id, full_name, wallet_balance")
          .eq("telegram_user_id", userId?.toString())
          .single();
        
        if (existingProfile) {
          await sendTelegramMessage(
            chatId,
            `Welcome back ${existingProfile.full_name || userName}! 👋\n\nYour account is already linked.\n\n💰 Balance: ₦${existingProfile.wallet_balance || 0} NC\n\nType /help to see available commands.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `Welcome to NaijaLancers Bot! 👋\n\nTo link your account:\n1. Go to NaijaLancers app\n2. Navigate to Wallet > Deposit\n3. Click "Deposit via Telegram"\n\nOr reply with your:\n• Email address\n• Or referral code`
          );
        }
        return new Response("OK", { status: 200 });
      }
      
      // Try to find user by email or referral code
      let userData = null;
      
      // Check if it's an email
      if (identifier.includes("@")) {
        const { data: authUser } = await supabase.auth.admin.listUsers();
        const user = authUser.users?.find(u => u.email?.toLowerCase() === identifier.toLowerCase());
        
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("user_id", user.id)
            .single();
          userData = profile;
        }
      } else {
        // Try referral code
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("referral_code", identifier.toUpperCase())
          .single();
        userData = profile;
      }

      if (userData) {
        // Link Telegram account
        await supabase
          .from("profiles")
          .update({
            telegram_user_id: userId?.toString(),
            telegram_username: message.from?.username || null
          })
          .eq("user_id", userData.user_id);

        await sendTelegramMessage(
          chatId,
          `✅ Account linked successfully!\n\nHello ${userData.full_name || userName}! 👋\n\nYour NaijaLancers account is now connected.\n\nCommands:\n/deposit - Make a deposit\n/balance - Check balance\n/help - Show all commands`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Account not found with: ${identifier}\n\nPlease check:\n• Your email is correct\n• Or use your referral code\n\nNeed help? Contact support in the app.`
        );
      }
      return new Response("OK", { status: 200 });
    }

    // Find user by telegram_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, wallet_balance, balance_withdrawable")
      .eq("telegram_user_id", userId?.toString())
      .single();

    if (!profile) {
      await sendTelegramMessage(
        chatId,
        `⚠️ Account not linked.\n\nPlease link your NaijaLancers account first by clicking the Telegram deposit link in the app.`
      );
      return new Response("OK", { status: 200 });
    }

    // Command: /deposit - Show deposit instructions
    if (text === "/deposit") {
      await sendTelegramMessage(
        chatId,
        `💰 *Deposit Instructions*\n\n` +
        `Please transfer money to:\n\n` +
        `*Bank:* ${BANK_ACCOUNT.bank}\n` +
        `*Account Number:* ${BANK_ACCOUNT.number}\n` +
        `*Account Name:* ${BANK_ACCOUNT.name}\n\n` +
        `After making the transfer, send:\n` +
        `1. A screenshot of your transaction\n` +
        `2. The amount you deposited\n\n` +
        `Example: "500" (send amount, then screenshot)`,
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
        `📋 *Available Commands*\n\n` +
        `/deposit - Get deposit instructions\n` +
        `/balance - Check your balance\n` +
        `/help - Show this help message\n\n` +
        `To deposit: First type the amount, then send a screenshot of your payment proof.`
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