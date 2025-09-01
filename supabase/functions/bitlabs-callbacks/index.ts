import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const secretKey = Deno.env.get('BITLABS_SECRET_KEY')
    if (!secretKey) {
      return new Response('BitLabs secret key not configured', { status: 500 })
    }

    const url = new URL(req.url)
    const callbackType = url.searchParams.get('type') || 'reward'
    
    let body: any = {}
    const contentType = req.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      body = await req.json()
    } else {
      // Parse form data
      const formData = await req.formData()
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
    }

    console.log(`BitLabs ${callbackType} callback received:`, body)

    // Verify signature if present
    const signature = req.headers.get('x-bitlabs-signature') || body.sig
    if (signature) {
      const expectedSignature = createHmac('sha256', secretKey)
        .update(JSON.stringify(body))
        .digest('hex')
      
      if (signature !== expectedSignature) {
        console.error('Invalid signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    // Handle different callback types
    switch (callbackType) {
      case 'reward':
        await handleRewardCallback(supabaseClient, body)
        break
      case 'reconciliation':
        await handleReconciliationCallback(supabaseClient, body)
        break
      case 'offer_reward':
        await handleOfferRewardCallback(supabaseClient, body)
        break
      case 'offer_reconciliation':
        await handleOfferReconciliationCallback(supabaseClient, body)
        break
      case 'user_ban':
        await handleUserBanCallback(supabaseClient, body)
        break
      case 'magic_receipts':
        await handleMagicReceiptsCallback(supabaseClient, body)
        break
      case 'unrewarded_screenout':
        await handleUnrewardedScreenoutCallback(supabaseClient, body)
        break
      default:
        console.log('Unknown callback type:', callbackType)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Callback processing error:', error)
    return new Response('Error processing callback', { status: 500 })
  }
})

async function handleRewardCallback(supabase: any, data: any) {
  const { uid: user_id, oid: offer_id, reward, type } = data
  
  if (!user_id || !offer_id || reward === undefined) {
    console.error('Missing required reward callback data')
    return
  }

  try {
    // Convert USD cents to Naira (approximate conversion)
    const nairaReward = Math.round(reward * 4) // Assuming 1 USD = 400 NGN
    
    // Update survey completion
    const { error: updateError } = await supabase
      .from('survey_completions')
      .update({
        status: 'completed',
        points_earned: nairaReward,
        completed_at: new Date().toISOString(),
        callback_data: data
      })
      .eq('user_id', user_id)
      .eq('offer_id', offer_id)

    if (updateError) {
      console.error('Error updating survey completion:', updateError)
      return
    }

    // Update user's wallet balance
    const { error: walletError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: supabase.raw(`wallet_balance + ${nairaReward}`)
      })
      .eq('user_id', user_id)

    if (walletError) {
      console.error('Error updating wallet balance:', walletError)
    }

    console.log(`Rewarded user ${user_id} with ₦${nairaReward} for survey ${offer_id}`)
    
  } catch (error) {
    console.error('Error processing reward callback:', error)
  }
}

async function handleReconciliationCallback(supabase: any, data: any) {
  console.log('Reconciliation callback:', data)
  // Handle reconciliation logic here
}

async function handleOfferRewardCallback(supabase: any, data: any) {
  console.log('Offer reward callback:', data)
  // Handle offer-specific reward logic
}

async function handleOfferReconciliationCallback(supabase: any, data: any) {
  console.log('Offer reconciliation callback:', data)
  // Handle offer reconciliation logic
}

async function handleUserBanCallback(supabase: any, data: any) {
  console.log('User ban callback:', data)
  // Handle user ban logic
}

async function handleMagicReceiptsCallback(supabase: any, data: any) {
  console.log('Magic receipts callback:', data)
  // Handle magic receipts/cashback logic
}

async function handleUnrewardedScreenoutCallback(supabase: any, data: any) {
  console.log('Unrewarded screenout callback:', data)
  // Handle unrewarded screenout logic
}