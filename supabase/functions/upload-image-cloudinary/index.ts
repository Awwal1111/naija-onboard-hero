// Cloudinary image upload signature endpoint — used as a fallback when Catbox
// is unreachable. Returns short-lived signed params so the client uploads
// directly to Cloudinary (no Supabase egress).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const API_KEY = Deno.env.get('CLOUDINARY_API_KEY')
    const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return new Response(JSON.stringify({ error: 'Cloudinary not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const auth = req.headers.get("authorization")
    if (!auth) throw new Error("No authorization")
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""))
    if (authErr || !user) throw new Error("Unauthorized")

    const { folder = 'fallback' } = await req.json().catch(() => ({}))
    const safeFolder = String(folder).replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'fallback'

    const timestamp = Math.floor(Date.now() / 1000)
    const publicId = `img_${timestamp}_${Math.random().toString(36).slice(2, 9)}`
    const folderPath = `naijalancers/${safeFolder}/${user.id}`
    // Auto-format + auto-quality for max compression on Cloudinary side
    const eager = 'f_auto,q_auto'
    const paramsToSign = `eager=${eager}&folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}`

    const data = new TextEncoder().encode(paramsToSign + API_SECRET)
    const hash = await crypto.subtle.digest('SHA-1', data)
    const signature = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

    return new Response(JSON.stringify({
      success: true,
      uploadParams: {
        cloudName: CLOUD_NAME,
        apiKey: API_KEY,
        signature,
        timestamp,
        publicId,
        folder: folderPath,
        eager,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('[upload-image-cloudinary]', e)
    return new Response(JSON.stringify({ error: e?.message || 'Failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
