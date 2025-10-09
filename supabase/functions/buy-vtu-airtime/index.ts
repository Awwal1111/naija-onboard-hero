import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirtimeRequest {
  network: string;
  amount: number;
  phone: string;
}

async function getVTUToken() {
  const username = Deno.env.get('VTU_USERNAME');
  const password = Deno.env.get('VTU_PASSWORD');

  const response = await fetch('https://vtu.ng/wp-json/jwt-auth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'VTU authentication failed');
  }

  const data = await response.json();
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

    const { network, amount, phone }: AirtimeRequest = await req.json();

    // Validate input
    if (!network || !amount || !phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map network names to service IDs
    const serviceIdMap: { [key: string]: string } = {
      'MTN': 'mtn',
      'Airtel': 'airtel',
      'Glo': 'glo',
      '9mobile': '9mobile',
    };

    const serviceId = serviceIdMap[network] || network.toLowerCase();

    // Check user's wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, balance_withdrawable')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    if (profile.balance_withdrawable < amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient balance. Available: ${profile.balance_withdrawable} NC` 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from wallet
    await supabase
      .from('profiles')
      .update({
        wallet_balance: profile.wallet_balance - amount,
        balance_withdrawable: profile.balance_withdrawable - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Get VTU token
    const vtuToken = await getVTUToken();

    // Generate unique request ID
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Call VTU API
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/airtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vtuToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        phone: phone.replace(/\D/g, ''),
        service_id: serviceId,
        amount: amount,
      }),
    });

    const vtuData = await vtuResponse.json();
    console.log('VTU API response:', vtuData);

    const isSuccess = vtuData.code === 'success' && 
      (vtuData.data?.status === 'completed-api' || vtuData.data?.status === 'processing-api');

    // Log transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'airtime_purchase',
        amount: -amount,
        status: isSuccess ? 'completed' : 'failed',
        description: `Airtime purchase - ${network} ${phone}`,
        metadata: {
          network,
          phone,
          service_id: serviceId,
          vtu_order_id: vtuData.data?.order_id,
          vtu_request_id: requestId,
          vtu_response: vtuData,
        },
      });

    // Refund if failed
    if (!isSuccess) {
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
