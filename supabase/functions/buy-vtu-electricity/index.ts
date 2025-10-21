import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ElectricityRequest {
  provider: string
  meter_number: string
  meter_type: 'prepaid' | 'postpaid'
  amount: number
  pin: string
}

// Get VTU authentication token
async function getVTUToken() {
  const username = Deno.env.get('VTU_USERNAME')
  const password = Deno.env.get('VTU_PASSWORD')

  const response = await fetch('https://vtu.ng/wp-json/api/v1/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!response.ok) {
    throw new Error('VTU authentication failed')
  }

  const data = await response.json()
  return data.data.token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { provider, meter_number, meter_type, amount, pin }: ElectricityRequest = await req.json()

    console.log('Processing electricity purchase:', { provider, meter_number, amount })

    // Validate request
    if (!provider || !meter_number || !amount || !pin) {
      throw new Error('Missing required fields')
    }

    if (amount < 500) {
      throw new Error('Minimum purchase is ₦500')
    }

    // Get user profile and validate PIN
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('transaction_pin, balance_withdrawable')
      .eq('user_id', user.id)
      .single()

    if (profileError) throw profileError

    if (!profile.transaction_pin) {
      throw new Error('Please set up your transaction PIN first')
    }

    if (profile.transaction_pin !== pin) {
      throw new Error('Incorrect PIN')
    }

    if (profile.balance_withdrawable < amount) {
      throw new Error('Insufficient balance')
    }

    // Deduct from user's wallet
    const { error: deductError } = await supabaseClient
      .from('profiles')
      .update({
        wallet_balance: profile.balance_withdrawable - amount,
        balance_withdrawable: profile.balance_withdrawable - amount
      })
      .eq('user_id', user.id)

    if (deductError) throw deductError

    // Map provider to VTU service ID
    const providerMap: Record<string, string> = {
      'ikeja-electric': 'ikeja-electric',
      'eko-electric': 'eko-electric',
      'kano-electric': 'kano-electric',
      'portharcourt-electric': 'portharcourt-electric',
      'jos-electric': 'jos-electric',
      'ibadan-electric': 'ibadan-electric',
      'kaduna-electric': 'kaduna-electric',
      'abuja-electric': 'abuja-electric',
      'enugu-electric': 'enugu-electric',
      'benin-electric': 'benin-electric'
    }

    const serviceId = providerMap[provider]
    if (!serviceId) {
      throw new Error('Invalid electricity provider')
    }

    // Get VTU token
    const token = await getVTUToken()

    // Purchase electricity from VTU.ng
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v1/electricity', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: serviceId,
        meter_number: meter_number,
        meter_type: meter_type,
        amount: amount
      })
    })

    const vtuData = await vtuResponse.json()
    console.log('VTU response:', vtuData)

    if (!vtuResponse.ok || vtuData.code !== 'success') {
      // Refund user
      await supabaseClient
        .from('profiles')
        .update({
          wallet_balance: profile.balance_withdrawable,
          balance_withdrawable: profile.balance_withdrawable
        })
        .eq('user_id', user.id)

      throw new Error(vtuData.message || 'Electricity purchase failed')
    }

    // Log transaction
    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        kind: 'electricity_bill',
        amount: -amount,
        status: 'completed',
        reference: `Electricity: ${provider} - ${meter_number}`,
        metadata: {
          provider,
          meter_number,
          meter_type,
          vtu_order_id: vtuData.data?.order_id,
          token: vtuData.data?.token
        }
      })

    if (txError) {
      console.error('Transaction logging error:', txError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Electricity purchase successful',
        data: vtuData.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
