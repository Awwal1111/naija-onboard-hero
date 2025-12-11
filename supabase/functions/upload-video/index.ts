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

    const { videoBase64, userId, folder = 'feed' } = await req.json()

    if (!videoBase64) {
      return new Response(
        JSON.stringify({ error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Video Upload] Processing video upload for user:', userId)

    // Generate signature for authenticated upload
    const timestamp = Math.floor(Date.now() / 1000)
    const publicId = `video_${timestamp}_${Math.random().toString(36).substring(7)}`
    const folderPath = `naijalancers/${folder}/${userId || 'anonymous'}`
    
    // Create signature
    const paramsToSign = `folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}`
    const encoder = new TextEncoder()
    const data = encoder.encode(paramsToSign + CLOUDINARY_API_SECRET)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Prepare form data
    const formData = new FormData()
    formData.append('file', videoBase64)
    formData.append('api_key', CLOUDINARY_API_KEY)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder', folderPath)
    formData.append('public_id', publicId)
    formData.append('resource_type', 'video')
    formData.append('transformation', 'q_auto,f_mp4')
    
    // Upload to Cloudinary
    console.log('[Video Upload] Uploading to Cloudinary...')
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    const uploadResult = await uploadResponse.json()

    if (!uploadResponse.ok) {
      console.error('[Video Upload] Cloudinary error:', uploadResult)
      return new Response(
        JSON.stringify({ error: uploadResult.error?.message || 'Upload failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Video Upload] Upload successful:', uploadResult.secure_url)

    // Generate thumbnail URL
    const thumbnailUrl = uploadResult.secure_url.replace('/video/upload/', '/video/upload/w_320,h_240,c_limit/')

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: uploadResult.secure_url,
        thumbnailUrl: thumbnailUrl,
        publicId: uploadResult.public_id,
        duration: uploadResult.duration,
        format: uploadResult.format
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
