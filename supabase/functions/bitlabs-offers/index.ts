import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jwt from 'https://esm.sh/jsonwebtoken@9.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store (in production, use Redis or similar)  
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const checkRateLimit = (userId: string, limit: number = 100, windowMs: number = 60000): boolean => {
  const now = Date.now()
  const key = userId
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

const validateJWT = (token: string): { valid: boolean; userId?: string } => {
  try {
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!jwtSecret) {
      console.error('JWT secret not found')
      return { valid: false }
    }

    const decoded = jwt.verify(token, jwtSecret) as any
    return { valid: true, userId: decoded.sub }
  } catch (error) {
    console.error('JWT validation failed:', error)
    return { valid: false }
  }
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
    // Validate JWT token first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtValidation = validateJWT(token)
    
    if (!jwtValidation.valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestUserId = jwtValidation.userId!

    // Check rate limiting
    if (!checkRateLimit(requestUserId, 50, 300000)) { // 50 requests per 5 minutes
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for server operations
    )

    const requestBody = await req.json()
    const { user_id } = requestBody

    // Verify that the authenticated user matches the requested user_id
    if (user_id !== requestUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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