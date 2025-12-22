import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  userId?: string;
  phoneNumber?: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HTTPSMS_API_KEY = Deno.env.get('HTTPSMS_API_KEY');
    const SENDER_PHONE = '+2348061551614';
    
    if (!HTTPSMS_API_KEY) {
      console.error('[SMS] HTTPSMS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, phoneNumber, message } = await req.json() as SMSRequest;

    console.log('[SMS] ========================================');
    console.log('[SMS] Sending SMS notification');
    console.log('[SMS] User ID:', userId);
    console.log('[SMS] Phone:', phoneNumber ? 'provided directly' : 'will lookup');

    let recipientPhone = phoneNumber;

    // If userId provided, lookup phone number
    if (userId && !phoneNumber) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.phone_number) {
        console.log('[SMS] No phone number found for user:', userId);
        return new Response(
          JSON.stringify({ success: false, error: 'No phone number found for user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recipientPhone = profile.phone_number;
      console.log('[SMS] Found phone for user:', profile.full_name);
    }

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Nigeria if not already formatted
    let formattedPhone = recipientPhone.replace(/\s+/g, '').replace(/-/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+234' + formattedPhone;
    }

    console.log('[SMS] Formatted phone:', formattedPhone);
    console.log('[SMS] Message:', message.substring(0, 50) + '...');

    // Send SMS via HTTPSMS API
    const smsResponse = await fetch('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'x-api-key': HTTPSMS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        from: SENDER_PHONE,
        to: formattedPhone
      })
    });

    const smsResult = await smsResponse.json();
    console.log('[SMS] HTTPSMS Response:', JSON.stringify(smsResult));

    if (!smsResponse.ok) {
      console.error('[SMS] Failed to send SMS:', smsResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send SMS', details: smsResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log SMS sent
    if (userId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'sms_sent',
          title: 'SMS Notification',
          message: message.substring(0, 100),
          metadata: { phone: formattedPhone, sms_id: smsResult.data?.id }
        });
    }

    console.log('[SMS] ✅ SMS sent successfully');
    console.log('[SMS] ========================================');

    return new Response(
      JSON.stringify({ success: true, messageId: smsResult.data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SMS] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
