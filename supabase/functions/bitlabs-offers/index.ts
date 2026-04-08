import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BitLabsOffer {
  id: string
  name: string
  description: string
  reward: number
  duration: number
  category: string
  url: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use Supabase auth to validate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody = await req.json()
    const { user_id } = requestBody

    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get BitLabs API credentials
    const appToken = Deno.env.get('BITLABS_APP_TOKEN')
    const secretKey = Deno.env.get('BITLABS_SECRET_KEY')

    if (!appToken || !secretKey) {
      console.error('BitLabs credentials not configured')
      return new Response(
        JSON.stringify({ offers: [], message: 'Survey provider not configured. No surveys available.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      console.log(`Fetching BitLabs surveys for user: ${user_id}`)
      
      const bitLabsResponse = await fetch(`https://api.bitlabs.ai/v2/client/surveys`, {
        headers: {
          'X-Api-Token': appToken,
          'X-User-Id': user_id,
          'Content-Type': 'application/json'
        }
      })

      console.log(`BitLabs API status: ${bitLabsResponse.status}`)

      if (!bitLabsResponse.ok) {
        const errorText = await bitLabsResponse.text()
        console.error(`BitLabs API error: ${bitLabsResponse.status} - ${errorText}`)
        throw new Error(`BitLabs API error: ${bitLabsResponse.status}`)
      }

      const bitLabsData = await bitLabsResponse.json()
      
      if (bitLabsData.data?.restriction_reason) {
        const reason = bitLabsData.data.restriction_reason
        if (reason.not_verified) throw new Error('Publisher account not verified')
        if (reason.using_vpn) throw new Error('VPN detected - surveys not available')
        if (reason.banned) throw new Error('User is banned from surveys')
        if (reason.unsupported_country) throw new Error('Surveys not available in your country')
      }
      
      const surveys = bitLabsData.data?.surveys || []
      const offers: BitLabsOffer[] = surveys.map((survey: any) => ({
        id: survey.id,
        name: survey.category?.name || 'Survey',
        description: `Complete this ${survey.category?.name || 'survey'} and earn rewards`,
        reward: Math.round(parseFloat(survey.cpi) * 1600),
        duration: Math.round(survey.loi || 5),
        category: survey.category?.name || 'General',
        url: survey.click_url
      }))

      return new Response(
        JSON.stringify({ offers, success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('BitLabs API error:', error)
      return new Response(
        JSON.stringify({ offers: [], error: 'Survey provider temporarily unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
