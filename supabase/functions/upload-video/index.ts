import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')
    const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('[Video Upload] Missing Cloudinary credentials')
      return new Response(
        JSON.stringify({ error: 'Cloudinary not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, folder = 'feed' } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Video Upload] Generating signed upload params for user:', userId)

    // Generate signature for client-side authenticated upload
    const timestamp = Math.floor(Date.now() / 1000)
    const publicId = `video_${timestamp}_${Math.random().toString(36).substring(7)}`
    const folderPath = `naijalancers/${folder}/${userId}`
    
    // Create signature string (params must be in alphabetical order)
    const eagerTransforms = 'c_limit,h_240,w_320'
    const paramsToSign = `eager=${eagerTransforms}&folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}`
    const encoder = new TextEncoder()
    const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log('[Video Upload] Signed params generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        uploadParams: {
          cloudName: CLOUDINARY_CLOUD_NAME,
          apiKey: CLOUDINARY_API_KEY,
          signature,
          timestamp,
          publicId,
          folder: folderPath,
          eager: eagerTransforms,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Video Upload] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
