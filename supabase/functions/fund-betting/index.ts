import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BettingRequest {
  provider: string;
  customerId: string;
  amount: number;
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

    const { provider, customerId, amount, pin }: BettingRequest = await req.json();

    console.log('Betting fund request:', { provider, customerId, amount, user: user.id });

    // Validate input
    if (!provider || !customerId || !amount || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: provider, customerId, amount, or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount < 100 || amount > 100000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Amount must be between ₦100 and ₦100,000' }),
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

    // Get VTU token
    const vtuToken = await getVTUToken();

    console.log('Verifying customer...');

    // Verify customer first
    const verifyResponse = await fetch('https://vtu.ng/wp-json/api/v2/verify-customer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vtuToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
        service_id: provider,
      }),
    });

    const verifyData = await verifyResponse.json();
    console.log('Customer verification response:', JSON.stringify(verifyData));
    
    if (verifyData.code !== 'success') {
      console.log('Customer verification failed, refunding...');
      // Refund
      await supabase
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Customer verification failed: ${verifyData.message}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique request ID
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log('Calling VTU API with request ID:', requestId);

    // Call VTU API to fund betting account
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/betting', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vtuToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        customer_id: customerId,
        service_id: provider,
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
        kind: 'betting_fund',
        amount: -amount,
        status: isSuccess ? 'completed' : 'failed',
        reference: `Betting account funding - ${provider}`,
        metadata: {
          provider,
          customer_id: customerId,
          customer_name: verifyData.data?.customer_name,
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
          error: vtuData.message || 'Betting account funding failed',
          data: vtuData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction successful');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: vtuData.message || 'Betting account funded successfully',
        data: vtuData.data,
        customerName: verifyData.data?.customer_name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in fund-betting:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
