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
  smsType?: 'job_alert' | 'notification' | 'verification' | 'system';
  skipCharge?: boolean;
}

const NIGERIA_SMS_PRICE_NC = 10;

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function normalizeNigerianPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (/^\+234[789][01]\d{8}$/.test(cleaned)) return cleaned;
  if (/^234[789][01]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0[789][01]\d{8}$/.test(cleaned)) return `+234${cleaned.slice(1)}`;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const HTTPSMS_API_KEY = Deno.env.get('HTTPSMS_API_KEY');
    const SENDER_PHONE = '+2348061551614';

    if (!HTTPSMS_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'SMS service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!serviceKey || !timingSafeEqual(bearer, serviceKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
    const { userId, phoneNumber, message, smsType = 'notification', skipCharge = false } = await req.json() as SMSRequest;

    if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid message' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let recipientPhone = phoneNumber;
    let userProfile: any = null;

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_number, full_name, balance_withdrawable')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch user profile' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      userProfile = profile;
      if (!phoneNumber && !profile?.phone_number) {
        return new Response(JSON.stringify({ success: false, error: 'No phone number found for user' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      recipientPhone = phoneNumber || profile.phone_number;
    }

    if (!recipientPhone) {
      return new Response(JSON.stringify({ success: false, error: 'No phone number provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // HTTPSMS is currently used for Nigerian delivery only. Reject unsupported
    // destinations before any balance check, debit, transaction, or provider call.
    const formattedPhone = normalizeNigerianPhone(recipientPhone);
    if (!formattedPhone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'SMS is currently available only for valid Nigerian mobile numbers (+234). International SMS is not supported.'
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const shouldCharge = !skipCharge && smsType !== 'verification' && smsType !== 'system';
    if (shouldCharge && userId && userProfile) {
      const userBalance = userProfile.balance_withdrawable || 0;
      if (userBalance < NIGERIA_SMS_PRICE_NC) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Insufficient balance for SMS',
          required: NIGERIA_SMS_PRICE_NC,
          available: userBalance,
          isNigerian: true
        }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: debited, error: deductError } = await supabase
        .rpc('debit_user_balances', { p_user_id: userId, p_amount: NIGERIA_SMS_PRICE_NC });

      if (deductError || debited !== true) {
        console.error('[SMS] Failed to deduct balance:', deductError);
        return new Response(JSON.stringify({ success: false, error: 'Failed to process SMS payment' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'sms_charge',
        amount: -NIGERIA_SMS_PRICE_NC,
        description: 'SMS notification (Nigeria)',
        status: 'completed',
        metadata: { phone: formattedPhone.substring(0, 6) + '****', sms_type: smsType, country: 'NG' }
      });
    }

    const smsResponse = await fetch('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'x-api-key': HTTPSMS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: message, from: SENDER_PHONE, to: formattedPhone })
    });

    const smsResult = await smsResponse.json();
    if (!smsResponse.ok) {
      console.error('[SMS] Provider rejected message:', smsResult);
      // Do not overwrite a user's live balance with a stale pre-debit snapshot.
      // A compensating credit is handled separately rather than resetting balance.
      if (shouldCharge && userId) {
        const { error: refundError } = await supabase.rpc('credit_user_balances', {
          p_user_id: userId,
          p_amount: NIGERIA_SMS_PRICE_NC
        });
        if (refundError) console.error('[SMS] Refund credit failed:', refundError);
        else await supabase.from('transactions').insert({
          user_id: userId,
          type: 'sms_refund',
          amount: NIGERIA_SMS_PRICE_NC,
          description: 'SMS refund - delivery failed',
          status: 'completed'
        });
      }
      return new Response(JSON.stringify({ success: false, error: 'Failed to send SMS', details: smsResult }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'sms_sent',
        title: 'SMS Notification',
        message: message.substring(0, 100),
        metadata: { phone: formattedPhone.substring(0, 6) + '****', sms_id: smsResult.data?.id, cost: shouldCharge ? NIGERIA_SMS_PRICE_NC : 0, country: 'NG' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: smsResult.data?.id,
      cost: shouldCharge ? NIGERIA_SMS_PRICE_NC : 0,
      isNigerian: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[SMS] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
