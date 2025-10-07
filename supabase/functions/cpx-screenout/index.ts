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

    const transId = params.get('trans_id')
    const userId = params.get('user_id')
    const offerId = params.get('offer_id')

    console.log('CPX Screenout received:', { transId, userId, offerId })

    if (!userId || !transId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Log screenout event
    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        kind: 'cpx_screenout',
        amount: 0,
        status: 'failed',
        reference: `CPX Survey Screenout - Transaction ID: ${transId}, Offer: ${offerId}`
      })

    if (error) {
      console.error('Error logging screenout:', error)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Screenout logged' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing CPX screenout:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})