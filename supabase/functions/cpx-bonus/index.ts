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
    const bonusAmount = parseFloat(params.get('amount_local') || '0')
    const transId = params.get('trans_id')
    const offerId = params.get('offer_id')

    console.log('CPX Bonus received:', { userId, bonusAmount, transId })

    if (!userId || !bonusAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Credit bonus to user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: supabase.rpc('increment', { x: bonusAmount }),
        balance_withdrawable: supabase.rpc('increment', { x: bonusAmount })
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error crediting bonus:', updateError)
      throw updateError
    }

    // Log bonus transaction
    const { error: transError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        kind: 'cpx_bonus',
        amount: bonusAmount,
        status: 'completed',
        reference: `CPX Survey Bonus - Transaction ID: ${transId}, Offer: ${offerId}`
      })

    if (transError) {
      console.error('Error logging bonus:', transError)
    }

    console.log(`Successfully credited ${bonusAmount} NC bonus to user ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Bonus credited' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing CPX bonus:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})