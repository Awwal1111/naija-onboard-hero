import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const url = new URL(req.url)
    const params = url.searchParams

    // Extract CPX callback parameters
    const status = params.get('status')
    const transId = params.get('trans_id')
    const userId = params.get('user_id')
    const subId = params.get('sub_id') || ''
    const subId2 = params.get('sub_id_2') || ''
    const amountLocal = parseFloat(params.get('amount_local') || '0')
    const amountUsd = parseFloat(params.get('amount_usd') || '0')
    const offerId = params.get('offer_id')
    const hash = params.get('hash')
    const ipClick = params.get('ip_click')

    console.log('CPX Postback received:', {
      status,
      transId,
      userId,
      amountLocal,
      offerId
    })

    // Validate required parameters
    if (!userId || !transId || !status) {
      console.error('Missing required parameters')
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Status codes:
    // 1 = Completed
    // 2 = Canceled/Fraud (need to deduct)
    // 3 = Screenout
    // 4 = Quota full

    if (status === '1') {
      // Survey completed - credit user
      console.log(`Crediting user ${userId} with ${amountLocal} NC`)

      // Update user's wallet balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: supabase.rpc('increment', { x: amountLocal }),
          balance_withdrawable: supabase.rpc('increment', { x: amountLocal })
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating wallet:', updateError)
        throw updateError
      }

      // Log transaction
      const { error: transError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          kind: 'cpx_survey',
          amount: amountLocal,
          status: 'completed',
          reference: `CPX Survey - Transaction ID: ${transId}, Offer: ${offerId}`
        })

      if (transError) {
        console.error('Error logging transaction:', transError)
      }

      console.log(`Successfully credited ${amountLocal} NC to user ${userId}`)

    } else if (status === '2') {
      // Canceled/Fraud - deduct amount
      console.log(`Deducting ${amountLocal} NC from user ${userId} due to fraud/cancellation`)

      const { error: deductError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: supabase.rpc('decrement', { x: amountLocal }),
          balance_withdrawable: supabase.rpc('decrement', { x: amountLocal })
        })
        .eq('user_id', userId)

      if (deductError) {
        console.error('Error deducting from wallet:', deductError)
        throw deductError
      }

      // Log reversal transaction
      const { error: transError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          kind: 'cpx_reversal',
          amount: -amountLocal,
          status: 'completed',
          reference: `CPX Survey Reversal - Transaction ID: ${transId}, Reason: Fraud/Cancellation`
        })

      if (transError) {
        console.error('Error logging reversal:', transError)
      }

      console.log(`Successfully deducted ${amountLocal} NC from user ${userId}`)
    } else {
      console.log(`Survey status ${status} - no action taken`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Postback processed' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing CPX postback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})