import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { provider } = await req.json()

    if (!provider) {
      throw new Error('Provider is required')
    }

    const token = await getVTUToken()

    const response = await fetch(`https://vtu.ng/wp-json/api/v1/tv-variations?service_id=${provider}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok || data.code !== 'success') {
      throw new Error(data.message || 'Failed to fetch TV variations')
    }

    return new Response(
      JSON.stringify({ variations: data.data?.variations || [] }),
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
