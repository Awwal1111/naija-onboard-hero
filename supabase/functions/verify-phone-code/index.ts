import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { user_id, phone_number, code } = await req.json();

    console.log('[VERIFY_CODE] Verification request:', { user_id, phone_number, code });

    if (!user_id || !phone_number || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stored verification code
    const { data: storedCode, error: fetchError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError || !storedCode) {
      console.error('[VERIFY_CODE] No code found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'No verification code found. Please request a new one.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (storedCode.verified) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code already used. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(storedCode.expires_at) < new Date()) {
      console.log('[VERIFY_CODE] Code expired:', storedCode.expires_at);
      return new Response(
        JSON.stringify({ success: false, error: 'Verification code expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code matches
    if (storedCode.code !== code) {
      console.log('[VERIFY_CODE] Code mismatch:', { stored: storedCode.code, provided: code });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as verified
    await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('user_id', user_id);

    // Update user profile with verified phone
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone_verified: true,
        phone_number: phone_number,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('[VERIFY_CODE] Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[VERIFY_CODE] Phone verified successfully for user:', user_id);

    // Send success notification via Telegram
    const { data: profile } = await supabase
      .from('profiles')
      .select('telegram_user_id')
      .eq('user_id', user_id)
      .single();

    if (profile?.telegram_user_id) {
      const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_user_id,
              text: `✅ *Phone Verified Successfully!*\n\n📱 Phone: ${phone_number}\n\nYou've earned the phone verification badge! 🎉`,
              parse_mode: 'Markdown'
            })
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VERIFY_CODE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
