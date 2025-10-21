import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EducationRequest {
  service: string
  pin_type: string
  quantity: number
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

    const { service, pin_type, quantity, pin }: EducationRequest = await req.json()

    console.log('Processing education ePIN purchase:', { service, pin_type, quantity })

    // Validate request
    if (!service || !pin_type || !quantity || !pin) {
      throw new Error('Missing required fields')
    }

    if (quantity < 1 || quantity > 10) {
      throw new Error('Quantity must be between 1 and 10')
    }

    // Get user profile and validate PIN
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('transaction_pin, balance_withdrawable, email, full_name')
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

    // Get ePIN details to know the price
    const pinsResponse = await fetch(`https://vtu.ng/wp-json/api/v1/epin-variations?service_id=${service}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const pinsData = await pinsResponse.json()
    const pinInfo = pinsData.data?.variations?.find((p: any) => p.code === pin_type)
    
    if (!pinInfo) {
      throw new Error('Invalid PIN type selected')
    }

    const totalAmount = pinInfo.price * quantity

    if (profile.balance_withdrawable < totalAmount) {
      throw new Error('Insufficient balance')
    }

    // Deduct from user's wallet
    const { error: deductError } = await supabaseClient
      .from('profiles')
      .update({
        wallet_balance: profile.balance_withdrawable - totalAmount,
        balance_withdrawable: profile.balance_withdrawable - totalAmount
      })
      .eq('user_id', user.id)

    if (deductError) throw deductError

    // Purchase ePINs from VTU.ng
    const vtuResponse = await fetch('https://vtu.ng/wp-json/api/v1/epin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: service,
        variation_code: pin_type,
        quantity: quantity,
        email: profile.email || user.email
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

      throw new Error(vtuData.message || 'Education ePIN purchase failed')
    }

    // Log transaction
    const { error: txError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        kind: 'education_pin',
        amount: -totalAmount,
        status: 'completed',
        reference: `Education: ${service} - ${quantity} PIN(s)`,
        metadata: {
          service,
          pin_type,
          quantity,
          pin_name: pinInfo.name,
          vtu_order_id: vtuData.data?.order_id,
          pins: vtuData.data?.pins
        }
      })

    if (txError) {
      console.error('Transaction logging error:', txError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Education ePIN(s) purchased successfully',
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
