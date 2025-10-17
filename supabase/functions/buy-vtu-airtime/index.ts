import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirtimeRequest {
  network: string;
  amount: number;
  phone: string;
  pin: string;
}

async function getVTUToken() {
  const username = Deno.env.get('VTU_USERNAME');
  const password = Deno.env.get('VTU_PASSWORD');

  console.log('Getting VTU token for user:', username);

  const response = await fetch('https://vtu.ng/wp-json/jwt-auth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('VTU auth error:', error);
    throw new Error(error.message || 'VTU authentication failed');
  }

  const data = await response.json();
  console.log('VTU token obtained successfully');
  return data.token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { network, amount, phone, pin }: AirtimeRequest = await req.json();

    console.log('VTU Airtime request:', { network, amount, phone, user: user.id });

    // Validate input
    if (!network || !amount || !phone || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: network, amount, phone, or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's wallet balance and PIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable, transaction_pin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // Verify PIN
    if (!profile.transaction_pin || profile.transaction_pin !== pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PIN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User withdrawable balance:', profile.balance_withdrawable, 'Required:', amount);

    // Check withdrawable balance (excludes signup bonus and daily signin rewards)
    if (profile.balance_withdrawable < amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient withdrawable balance. Available: ₦${profile.balance_withdrawable} NC` 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from both wallet_balance and balance_withdrawable
    const { error: deductError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: profile.wallet_balance - amount,
        balance_withdrawable: profile.balance_withdrawable - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Wallet deduction error:', deductError);
      throw new Error('Failed to deduct from wallet');
    }

    console.log('Wallet deducted successfully');

    // Map network names to service IDs (ensure lowercase)
    const serviceIdMap: { [key: string]: string } = {
      'MTN': 'mtn',
      'Airtel': 'airtel',
      'Glo': 'glo',
      '9mobile': '9mobile',
      'mtn': 'mtn',
      'airtel': 'airtel',
      'glo': 'glo',
    };

    const serviceId = serviceIdMap[network];
    
    if (!serviceId) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid network: ${network}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number must be 10 or 11 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get VTU token
    const vtuToken = await getVTUToken();

    // Generate unique request ID
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log('Calling VTU API with request ID:', requestId);

    // Call VTU API
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/airtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vtuToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        phone: cleanPhone,
        service_id: serviceId,
        amount: amount,
      }),
    });

    const vtuData = await vtuResponse.json();
    console.log('VTU API response:', JSON.stringify(vtuData));

    const isSuccess = vtuData.code === 'success' && 
      (vtuData.data?.status === 'completed-api' || vtuData.data?.status === 'processing-api');

    // Log transaction
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        kind: 'airtime_purchase',
        amount: -amount,
        status: isSuccess ? 'completed' : 'failed',
        reference: `Airtime purchase - ${network} ${cleanPhone}`,
        metadata: {
          network,
          phone: cleanPhone,
          service_id: serviceId,
          vtu_order_id: vtuData.data?.order_id,
          vtu_request_id: requestId,
          vtu_response: vtuData,
        },
      });

    if (txError) {
      console.error('Transaction logging error:', txError);
    }

    // Refund if failed
    if (!isSuccess) {
      console.log('Transaction failed, refunding...');
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance,
          balance_withdrawable: profile.balance_withdrawable,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: vtuData.message || 'Airtime purchase failed',
          data: vtuData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction successful');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: vtuData.message || 'Airtime purchased successfully',
        data: vtuData.data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in buy-vtu-airtime:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
