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
  skipCharge?: boolean; // For system/verification SMS that should be free
}

// SMS pricing in NC
const SMS_PRICING = {
  nigeria: 10,        // 10 NC for Nigerian numbers
  international: 25,  // 25 NC for international numbers
};

// Check if phone number is Nigerian
function isNigerianNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  return cleaned.startsWith('+234') || 
         cleaned.startsWith('234') || 
         cleaned.startsWith('0') && cleaned.length === 11;
}

// Get country code from phone number
function getCountryFromPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+234') || cleaned.startsWith('234')) return 'NG';
  if (cleaned.startsWith('+1')) return 'US';
  if (cleaned.startsWith('+44')) return 'UK';
  if (cleaned.startsWith('+254')) return 'KE';
  if (cleaned.startsWith('+233')) return 'GH';
  if (cleaned.startsWith('+27')) return 'ZA';
  if (cleaned.startsWith('+91')) return 'IN';
  if (cleaned.startsWith('+971')) return 'AE';
  return 'OTHER';
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

    const { userId, phoneNumber, message, smsType = 'notification', skipCharge = false } = await req.json() as SMSRequest;

    console.log('[SMS] ========================================');
    console.log('[SMS] Sending SMS notification');
    console.log('[SMS] User ID:', userId);
    console.log('[SMS] SMS Type:', smsType);
    console.log('[SMS] Phone:', phoneNumber ? 'provided directly' : 'will lookup');

    let recipientPhone = phoneNumber;
    let userProfile: any = null;

    // If userId provided, lookup phone number and profile
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_number, full_name, balance_withdrawable, country')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.log('[SMS] Error fetching profile:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch user profile' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userProfile = profile;

      if (!phoneNumber && !profile?.phone_number) {
        console.log('[SMS] No phone number found for user:', userId);
        return new Response(
          JSON.stringify({ success: false, error: 'No phone number found for user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recipientPhone = phoneNumber || profile.phone_number;
      console.log('[SMS] Found phone for user:', profile.full_name);
    }

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if Nigerian or international
    const isNigerian = isNigerianNumber(recipientPhone);
    const countryCode = getCountryFromPhone(recipientPhone);
    const smsCost = isNigerian ? SMS_PRICING.nigeria : SMS_PRICING.international;
    
    console.log('[SMS] Phone country:', countryCode, isNigerian ? '(Nigeria)' : '(International)');
    console.log('[SMS] SMS Cost:', smsCost, 'NC');

    // Check balance and charge if not a free SMS type
    const shouldCharge = !skipCharge && smsType !== 'verification' && smsType !== 'system';
    
    if (shouldCharge && userId && userProfile) {
      const userBalance = userProfile.balance_withdrawable || 0;
      
      console.log('[SMS] User withdrawable balance:', userBalance, 'NC');
      
      if (userBalance < smsCost) {
        console.log('[SMS] ❌ Insufficient balance. Required:', smsCost, 'NC, Available:', userBalance, 'NC');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Insufficient balance for SMS',
            required: smsCost,
            available: userBalance,
            isNigerian
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct the SMS cost from user's withdrawable balance
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ 
          balance_withdrawable: userBalance - smsCost 
        })
        .eq('user_id', userId);

      if (deductError) {
        console.error('[SMS] Failed to deduct balance:', deductError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to process SMS payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'sms_charge',
          amount: -smsCost,
          description: `SMS notification (${isNigerian ? 'Nigeria' : 'International'})`,
          status: 'completed',
          metadata: { 
            phone: recipientPhone.substring(0, 6) + '****', 
            sms_type: smsType,
            country: countryCode
          }
        });

      console.log('[SMS] ✅ Charged', smsCost, 'NC for SMS');
    }

    // Format phone number for Nigeria if not already formatted
    let formattedPhone = recipientPhone.replace(/\s+/g, '').replace(/-/g, '');
    if (isNigerian) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+234' + formattedPhone;
      }
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log('[SMS] Formatted phone:', formattedPhone);
    console.log('[SMS] Message:', message.substring(0, 50) + '...');

    // HTTPSMS currently only reliably supports Nigerian numbers
    // For international, we log but may not guarantee delivery
    if (!isNigerian) {
      console.log('[SMS] ⚠️ International number detected. HTTPSMS may have limited support.');
    }

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
      
      // If SMS failed and we charged, refund the user
      if (shouldCharge && userId) {
        console.log('[SMS] Refunding SMS charge due to failure...');
        await supabase
          .from('profiles')
          .update({ 
            balance_withdrawable: (userProfile?.balance_withdrawable || 0) 
          })
          .eq('user_id', userId);
        
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'sms_refund',
            amount: smsCost,
            description: `SMS refund - delivery failed`,
            status: 'completed'
          });
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send SMS', details: smsResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log SMS sent notification
    if (userId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'sms_sent',
          title: 'SMS Notification',
          message: message.substring(0, 100),
          metadata: { 
            phone: formattedPhone.substring(0, 6) + '****', 
            sms_id: smsResult.data?.id,
            cost: shouldCharge ? smsCost : 0,
            country: countryCode
          }
        });
    }

    console.log('[SMS] ✅ SMS sent successfully');
    console.log('[SMS] Cost charged:', shouldCharge ? smsCost : 0, 'NC');
    console.log('[SMS] ========================================');

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: smsResult.data?.id,
        cost: shouldCharge ? smsCost : 0,
        isNigerian
      }),
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
