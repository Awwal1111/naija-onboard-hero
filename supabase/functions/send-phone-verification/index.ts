import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, phone_number } = await req.json();

    console.log('[PHONE_VERIFY] Send code request:', { user_id, phone_number });

    if (!user_id || !phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing user_id or phone_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with telegram_user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_user_id, full_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('[PHONE_VERIFY] Profile not found:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.telegram_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram account not linked. Please link your Telegram first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log('[PHONE_VERIFY] Generated code for user:', { user_id, code, expiresAt });

    // Store code in database (upsert to handle retries)
    const { error: upsertError } = await supabase
      .from('phone_verification_codes')
      .upsert({
        user_id,
        phone_number,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('[PHONE_VERIFY] Failed to store code:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send code via Telegram
    const telegramMessage = 
      `🔐 *Phone Verification Code*\n\n` +
      `Your verification code is:\n\n` +
      `📱 \`${code}\`\n\n` +
      `This code expires in 5 minutes.\n\n` +
      `If you didn't request this, please ignore this message.`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.telegram_user_id,
          text: telegramMessage,
          parse_mode: 'Markdown'
        })
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('[PHONE_VERIFY] Telegram send failed:', telegramResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send code via Telegram' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PHONE_VERIFY] Code sent successfully to:', profile.telegram_user_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent to your Telegram' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PHONE_VERIFY] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
