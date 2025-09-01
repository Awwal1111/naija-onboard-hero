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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token for this request
    supabaseClient.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get BitLabs API credentials
    const appToken = Deno.env.get('BITLABS_APP_TOKEN')
    const secretKey = Deno.env.get('BITLABS_SECRET_KEY')

    if (!appToken || !secretKey) {
      console.error('BitLabs credentials not configured')
      // Return mock data for development
      const mockOffers: BitLabsOffer[] = [
        {
          id: 'mock-1',
          name: 'Consumer Habits Survey',
          description: 'Tell us about your shopping and lifestyle preferences',
          reward: 50,
          duration: 5,
          category: 'Consumer',
          url: '#'
        },
        {
          id: 'mock-2',
          name: 'Technology Survey',
          description: 'Share your thoughts on the latest tech trends',
          reward: 75,
          duration: 8,
          category: 'Technology',
          url: '#'
        },
        {
          id: 'mock-3',
          name: 'Travel & Lifestyle Survey',
          description: 'Help us understand travel and lifestyle patterns',
          reward: 100,
          duration: 12,
          category: 'Lifestyle',
          url: '#'
        }
      ]

      return new Response(
        JSON.stringify({ offers: mockOffers }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Make request to BitLabs API
      const bitLabsResponse = await fetch(`https://api.bitlabs.ai/v1/surveys/list?uid=${user_id}`, {
        headers: {
          'X-Api-Token': appToken,
          'Content-Type': 'application/json'
        }
      })

      if (!bitLabsResponse.ok) {
        throw new Error(`BitLabs API error: ${bitLabsResponse.status}`)
      }

      const bitLabsData = await bitLabsResponse.json()
      
      // Transform BitLabs data to our format
      const offers: BitLabsOffer[] = (bitLabsData.surveys || []).map((survey: any) => ({
        id: survey.id,
        name: survey.name || 'Survey',
        description: survey.description || 'Complete this survey for rewards',
        reward: Math.round(survey.reward * 400), // Convert USD cents to Naira (approx rate)
        duration: survey.time || 5,
        category: survey.category || 'General',
        url: survey.url || '#'
      }))

      return new Response(
        JSON.stringify({ offers }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('BitLabs API error:', error)
      // Return mock data on API error
      const mockOffers: BitLabsOffer[] = [
        {
          id: 'fallback-1',
          name: 'Quick Survey',
          description: 'A short survey about your preferences',
          reward: 30,
          duration: 3,
          category: 'Quick',
          url: '#'
        }
      ]

      return new Response(
        JSON.stringify({ offers: mockOffers }),
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