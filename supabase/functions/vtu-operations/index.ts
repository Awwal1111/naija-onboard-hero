import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// HMAC SHA256 verification function for webhooks
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

// Get VTU authentication token
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

// Airtime purchase operation
async function handleAirtimePurchase(supabase: any, user: any, requestData: any) {
  const { network, amount, phone, pin } = requestData;

  console.log('VTU Airtime request:', { network, amount, phone, user: user.id });

  // Validate input
  if (!network || !amount || !phone || !pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields: network, amount, phone, or pin' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check user's wallet balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance, balance_withdrawable')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  // Get PIN from user_secrets
  const { data: secrets } = await supabase
    .from('user_secrets')
    .select('transaction_pin')
    .eq('user_id', user.id)
    .single();

  const transactionPin = secrets?.transaction_pin || (profile as any)?.transaction_pin;

  // Verify PIN
  if (!transactionPin || transactionPin !== pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid PIN' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('User withdrawable balance:', profile.balance_withdrawable, 'Required:', amount);

  // Check withdrawable balance
  if (profile.balance_withdrawable < amount) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Insufficient withdrawable balance. Available: ₦${profile.balance_withdrawable} NC`
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Deduct from wallet
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

  // Map network names to service IDs
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

  // Clean phone number
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
}

// Data purchase operation
async function handleDataPurchase(supabase: any, user: any, requestData: any) {
  const { network, phone, variationId, dataPlan, price, pin } = requestData;

  console.log('VTU Data request:', { network, phone, variationId, dataPlan, price, user: user.id });

  // Validate input
  if (!network || !phone || !variationId || !dataPlan || !price || !pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check user's wallet balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance, balance_withdrawable')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  // Get PIN from user_secrets
  const { data: secrets } = await supabase
    .from('user_secrets')
    .select('transaction_pin')
    .eq('user_id', user.id)
    .single();

  const transactionPin = secrets?.transaction_pin || (profile as any)?.transaction_pin;

  // Verify PIN
  if (!transactionPin || transactionPin !== pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid PIN' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('User withdrawable balance:', profile.balance_withdrawable, 'Required:', price);

  // Check withdrawable balance
  if (profile.balance_withdrawable < price) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Insufficient withdrawable balance. Available: ₦${profile.balance_withdrawable} NC`
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Deduct from wallet
  const { error: deductError } = await supabase
    .from('profiles')
    .update({
      wallet_balance: profile.wallet_balance - price,
      balance_withdrawable: profile.balance_withdrawable - price,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (deductError) {
    console.error('Wallet deduction error:', deductError);
    throw new Error('Failed to deduct from wallet');
  }

  console.log('Wallet deducted successfully');

  // Clean phone number
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

  console.log('Calling VTU API for data with request ID:', requestId);

  // Call VTU API for data
  const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/data', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vtuToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: requestId,
      phone: cleanPhone,
      variation_id: variationId,
    }),
  });

  const vtuData = await vtuResponse.json();
  console.log('VTU Data API response:', JSON.stringify(vtuData));

  const isSuccess = vtuData.code === 'success' &&
    (vtuData.data?.status === 'completed-api' || vtuData.data?.status === 'processing-api');

  // Log transaction
  const { error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      kind: 'data_purchase',
      amount: -price,
      status: isSuccess ? 'completed' : 'failed',
      reference: `Data purchase - ${network} ${dataPlan} ${cleanPhone}`,
      metadata: {
        network,
        phone: cleanPhone,
        variation_id: variationId,
        data_plan: dataPlan,
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
        error: vtuData.message || 'Data purchase failed',
        data: vtuData
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Data transaction successful');

  return new Response(
    JSON.stringify({
      success: true,
      message: vtuData.message || 'Data purchased successfully',
      data: vtuData.data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Cable TV purchase operation
async function handleCableTVPurchase(supabase: any, user: any, requestData: any) {
  const { provider, smartCardNumber, variationId, packageName, price, pin } = requestData;

  console.log('VTU Cable TV request:', { provider, smartCardNumber, variationId, packageName, price, user: user.id });

  // Validate input
  if (!provider || !smartCardNumber || !variationId || !packageName || !price || !pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check user's wallet balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance, balance_withdrawable')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  // Get PIN from user_secrets
  const { data: secrets } = await supabase
    .from('user_secrets')
    .select('transaction_pin')
    .eq('user_id', user.id)
    .single();

  const transactionPin = secrets?.transaction_pin || (profile as any)?.transaction_pin;

  // Verify PIN
  if (!transactionPin || transactionPin !== pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid PIN' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('User withdrawable balance:', profile.balance_withdrawable, 'Required:', price);

  // Check withdrawable balance
  if (profile.balance_withdrawable < price) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Insufficient withdrawable balance. Available: ₦${profile.balance_withdrawable} NC`
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Deduct from wallet
  const { error: deductError } = await supabase
    .from('profiles')
    .update({
      wallet_balance: profile.wallet_balance - price,
      balance_withdrawable: profile.balance_withdrawable - price,
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

  // Generate unique request ID
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log('Calling VTU API for cable TV with request ID:', requestId);

  // Call VTU API for cable TV
  const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/tv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vtuToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: requestId,
      customer_id: smartCardNumber,
      variation_id: variationId,
    }),
  });

  const vtuData = await vtuResponse.json();
  console.log('VTU Cable TV API response:', JSON.stringify(vtuData));

  const isSuccess = vtuData.code === 'success' &&
    (vtuData.data?.status === 'completed-api' || vtuData.data?.status === 'processing-api');

  // Log transaction
  const { error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      kind: 'cable_tv_purchase',
      amount: -price,
      status: isSuccess ? 'completed' : 'failed',
      reference: `Cable TV purchase - ${provider} ${packageName} ${smartCardNumber}`,
      metadata: {
        provider,
        smart_card_number: smartCardNumber,
        variation_id: variationId,
        package_name: packageName,
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
        error: vtuData.message || 'Cable TV purchase failed',
        data: vtuData
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Cable TV transaction successful');

  return new Response(
    JSON.stringify({
      success: true,
      message: vtuData.message || 'Cable TV purchased successfully',
      data: vtuData.data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Electricity purchase operation
async function handleElectricityPurchase(supabase: any, user: any, requestData: any) {
  const { provider, meterNumber, meterType, variationId, packageName, price, pin } = requestData;

  console.log('VTU Electricity request:', { provider, meterNumber, meterType, variationId, packageName, price, user: user.id });

  // Validate input
  if (!provider || !meterNumber || !meterType || !variationId || !packageName || !price || !pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check user's wallet balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance, balance_withdrawable')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  // Get PIN from user_secrets
  const { data: secrets } = await supabase
    .from('user_secrets')
    .select('transaction_pin')
    .eq('user_id', user.id)
    .single();

  const transactionPin = secrets?.transaction_pin || (profile as any)?.transaction_pin;

  // Verify PIN
  if (!transactionPin || transactionPin !== pin) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid PIN' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('User withdrawable balance:', profile.balance_withdrawable, 'Required:', price);

  // Check withdrawable balance
  if (profile.balance_withdrawable < price) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Insufficient withdrawable balance. Available: ₦${profile.balance_withdrawable} NC`
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Deduct from wallet
  const { error: deductError } = await supabase
    .from('profiles')
    .update({
      wallet_balance: profile.wallet_balance - price,
      balance_withdrawable: profile.balance_withdrawable - price,
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

  // Generate unique request ID
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log('Calling VTU API for electricity with request ID:', requestId);

  // Call VTU API for electricity
  const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/electricity', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vtuToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: requestId,
      customer_id: meterNumber,
      variation_id: variationId,
      meter_type: meterType,
    }),
  });

  const vtuData = await vtuResponse.json();
  console.log('VTU Electricity API response:', JSON.stringify(vtuData));

  const isSuccess = vtuData.code === 'success' &&
    (vtuData.data?.status === 'completed-api' || vtuData.data?.status === 'processing-api');

  // Log transaction
  const { error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      kind: 'electricity_purchase',
      amount: -price,
      status: isSuccess ? 'completed' : 'failed',
      reference: `Electricity purchase - ${provider} ${packageName} ${meterNumber}`,
      metadata: {
        provider,
        meter_number: meterNumber,
        meter_type: meterType,
        variation_id: variationId,
        package_name: packageName,
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
        error: vtuData.message || 'Electricity purchase failed',
        data: vtuData
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Electricity transaction successful');

  return new Response(
    JSON.stringify({
      success: true,
      message: vtuData.message || 'Electricity purchased successfully',
      data: vtuData.data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify cable customer
async function handleVerifyCableCustomer(requestData: any) {
  const { provider, smart_card_number } = requestData;

  if (!provider || !smart_card_number) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields: provider, smart_card_number' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = await getVTUToken();

  const response = await fetch('https://vtu.ng/wp-json/api/v2/verify-customer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_id: smart_card_number,
      service_id: provider
    })
  });

  const data = await response.json();

  if (!response.ok || data.code !== 'success') {
    return new Response(
      JSON.stringify({ success: false, error: data.message || 'Verification failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify electricity customer
async function handleVerifyElectricityCustomer(requestData: any) {
  const { provider, meter_number, meter_type } = requestData;

  if (!provider || !meter_number || !meter_type) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields: provider, meter_number, meter_type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = await getVTUToken();

  const response = await fetch('https://vtu.ng/wp-json/api/v2/verify-customer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_id: meter_number,
      service_id: provider,
      meter_type: meter_type
    })
  });

  const data = await response.json();

  if (!response.ok || data.code !== 'success') {
    return new Response(
      JSON.stringify({ success: false, error: data.message || 'Verification failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get TV variations
async function handleGetTVVariations(requestData: any) {
  const { provider } = requestData;

  if (!provider) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required field: provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = await getVTUToken();

  const response = await fetch(`https://vtu.ng/wp-json/api/v2/tv-variations?service_id=${provider}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok || data.code !== 'success') {
    return new Response(
      JSON.stringify({ success: false, error: data.message || 'Failed to get TV variations' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle VTU webhook
async function handleVTUWebhook(supabase: any, requestData: any, signature: string) {
  const vtuUserPin = Deno.env.get('VTU_USER_PIN')!;

  // Verify signature
  const rawBody = JSON.stringify(requestData);
  const isValidSignature = await verifySignature(rawBody, signature, vtuUserPin);

  if (!isValidSignature) {
    console.error('Invalid webhook signature');
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('VTU Webhook received:', requestData);

  // Process webhook data - update transaction status based on VTU response
  const { order_id, status, reference } = requestData;

  if (order_id && status) {
    // Find and update the transaction
    const { data: transaction, error: findError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('metadata->>vtu_order_id', order_id)
      .single();

    if (transaction && !findError) {
      const newStatus = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing';

      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: newStatus,
          metadata: {
            ...transaction.metadata,
            webhook_update: requestData,
            webhook_received_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Error updating transaction from webhook:', updateError);
      } else {
        console.log('Transaction updated from webhook:', order_id, status);
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Webhook processed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const operation = url.searchParams.get('operation');

    if (!operation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing operation parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = req.method === 'POST' ? await req.json() : {};

    // Handle webhook separately (no auth required)
    if (operation === 'webhook') {
      const signature = req.headers.get('x-signature') || '';
      return await handleVTUWebhook(supabase, requestData, signature);
    }

    // For other operations, require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route to appropriate handler
    switch (operation) {
      case 'airtime':
        return await handleAirtimePurchase(supabase, user, requestData);
      case 'data':
        return await handleDataPurchase(supabase, user, requestData);
      case 'cable-tv':
        return await handleCableTVPurchase(supabase, user, requestData);
      case 'electricity':
        return await handleElectricityPurchase(supabase, user, requestData);
      case 'verify-cable':
        return await handleVerifyCableCustomer(requestData);
      case 'verify-electricity':
        return await handleVerifyElectricityCustomer(requestData);
      case 'tv-variations':
        return await handleGetTVVariations(requestData);
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Error in vtu-operations:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});