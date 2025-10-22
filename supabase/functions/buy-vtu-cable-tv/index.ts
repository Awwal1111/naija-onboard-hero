import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CableTVRequest {
  provider: string
  smart_card_number: string
  plan_code: string
  pin: string
}

// Get VTU authentication token
async function getVTUToken() {
  const username = Deno.env.get('VTU_USERNAME')
  const password = Deno.env.get('VTU_PASSWORD')

  const response = await fetch('https://vtu.ng/wp-json/api/v2/auth', {
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

    const { provider, smart_card_number, plan_code, pin }: CableTVRequest = await req.json()

    console.log('Processing cable TV purchase:', { provider, smart_card_number, plan_code })

    // Validate request
    if (!provider || !smart_card_number || !plan_code || !pin) {
      throw new Error('Missing required fields')
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

    // Get VTU token
    const token = await getVTUToken()

    // Get plan details using v2 API
    const plansResponse = await fetch(`https://vtu.ng/wp-json/api/v2/variations/tv?service_id=${provider}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const plansData = await plansResponse.json()
    const plan = plansData.data?.find((p: any) => p.variation_id?.toString() === plan_code)
    
    if (!plan) {
      throw new Error('Invalid plan selected')
    }

    const amount = parseFloat(plan.price || '0')

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

    // Generate unique request ID
    const requestId = `tv_${user.id}_${Date.now()}`

    // Purchase cable TV subscription from VTU.ng
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v2/tv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        request_id: requestId,
        customer_id: smart_card_number,
        service_id: provider,
        variation_id: plan_code,
        subscription_type: 'renew'
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

      throw new Error(vtuData.message || 'Cable TV purchase failed')
    }

    // Log transaction
    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        kind: 'cable_tv',
        amount: -amount,
        status: 'completed',
        reference: `Cable TV: ${provider} - ${smart_card_number}`,
        metadata: {
          provider,
          smart_card_number,
          plan_code,
          plan_name: plan.package_bouquet || plan.name,
          vtu_order_id: vtuData.data?.order_id
        }
      })

    if (txError) {
      console.error('Transaction logging error:', txError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cable TV subscription successful',
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
