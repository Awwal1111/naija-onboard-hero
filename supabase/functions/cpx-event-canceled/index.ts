import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const params = url.searchParams

    const userId = params.get('user_id')
    const amountLocal = parseFloat(params.get('amount_local') || '0')
    const transId = params.get('trans_id')
    const offerId = params.get('offer_id')

    console.log('CPX Event Canceled received:', { userId, amountLocal, transId })

    if (!userId || !transId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Deduct the canceled amount
    if (amountLocal > 0) {
      const { error: deductError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: supabase.rpc('decrement', { x: amountLocal }),
          balance_withdrawable: supabase.rpc('decrement', { x: amountLocal })
        })
        .eq('user_id', userId)

      if (deductError) {
        console.error('Error deducting canceled amount:', deductError)
        throw deductError
      }
    }

    // Log cancellation
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        kind: 'cpx_canceled',
        amount: -amountLocal,
        status: 'completed',
        reference: `CPX Event Canceled - Transaction ID: ${transId}, Offer: ${offerId}`
      })

    if (transError) {
      console.error('Error logging cancellation:', transError)
    }

    console.log(`Successfully processed cancellation for user ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Event cancellation processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing CPX event canceled:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})