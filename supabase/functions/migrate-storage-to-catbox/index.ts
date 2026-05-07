// One-shot migrator: rewrites Supabase Storage URLs in selected tables to
// Catbox (with Cloudinary fallback). Admin-only. Process in small batches.
//
// POST body: { table: 'profiles'|'stories'|'portfolio_items', limit?: number, dryRun?: boolean }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLE_MAP: Record<string, { col: string; folder: string }> = {
  profiles: { col: 'profile_picture_url', folder: 'profiles' },
  stories: { col: 'media_url', folder: 'stories' },
  portfolio_items: { col: 'media_url', folder: 'portfolio' },
}

const SUPABASE_HOST_FRAGMENT = 'supabase.co/storage'

async function uploadToCatbox(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData()
  fd.append('reqtype', 'fileupload')
  fd.append('fileToUpload', new File([blob], filename, { type: blob.type || 'image/jpeg' }))
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const r = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd, signal: ctrl.signal })
    if (!r.ok) throw new Error(`Catbox HTTP ${r.status}`)
    const url = (await r.text()).trim()
    if (!url.startsWith('https://files.catbox.moe/')) throw new Error('Bad Catbox response')
    return url
  } finally {
    clearTimeout(t)
  }
}

async function uploadToCloudinary(blob: Blob, folder: string): Promise<string> {
  const CLOUD = Deno.env.get('CLOUDINARY_CLOUD_NAME')!
  const KEY = Deno.env.get('CLOUDINARY_API_KEY')!
  const SECRET = Deno.env.get('CLOUDINARY_API_SECRET')!
  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `mig_${timestamp}_${Math.random().toString(36).slice(2, 9)}`
  const folderPath = `naijalancers/${folder}/migrated`
  const eager = 'f_auto,q_auto'
  const paramsToSign = `eager=${eager}&folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}`
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(paramsToSign + SECRET))
  const sig = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

  const fd = new FormData()
  fd.append('file', new File([blob], `${publicId}.jpg`, { type: blob.type || 'image/jpeg' }))
  fd.append('api_key', KEY)
  fd.append('timestamp', String(timestamp))
  fd.append('signature', sig)
  fd.append('folder', folderPath)
  fd.append('public_id', publicId)
  fd.append('eager', eager)

  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd })
  const j = await r.json()
  if (!r.ok || !j.secure_url) throw new Error(j?.error?.message || 'Cloudinary failed')
  return j.secure_url as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const auth = req.headers.get("authorization")
    if (!auth) throw new Error("No authorization")
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""))
    if (authErr || !user) throw new Error("Unauthorized")

    // Admin gate
    const { data: isAdmin } = await supabase.rpc('has_admin_access' as any).single().then(r => r).catch(() => ({ data: false }))
    if (!isAdmin) {
      // Fallback: check user_roles
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).limit(5)
      const ok = (roles || []).some((r: any) => ['admin', 'super_admin', 'moderator'].includes(r.role))
      if (!ok) throw new Error("Admin only")
    }

    const { table, limit = 25, dryRun = false } = await req.json()
    const cfg = TABLE_MAP[String(table)]
    if (!cfg) throw new Error(`Unsupported table. Allowed: ${Object.keys(TABLE_MAP).join(', ')}`)

    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100)

    const { data: rows, error: fetchErr } = await supabase
      .from(table)
      .select(`id, ${cfg.col}`)
      .ilike(cfg.col, `%${SUPABASE_HOST_FRAGMENT}%`)
      .limit(lim)
    if (fetchErr) throw fetchErr

    const results: Array<{ id: string; ok: boolean; provider?: string; newUrl?: string; error?: string }> = []
    for (const row of (rows || []) as any[]) {
      const oldUrl = row[cfg.col] as string
      try {
        // Download from Supabase Storage (anonymous public URL)
        const dl = await fetch(oldUrl, { signal: AbortSignal.timeout(20_000) })
        if (!dl.ok) throw new Error(`Download HTTP ${dl.status}`)
        const blob = await dl.blob()
        if (blob.size === 0) throw new Error('Empty blob')
        const filename = oldUrl.split('/').pop() || `file_${Date.now()}.jpg`

        let newUrl = ''
        let provider = 'catbox'
        try {
          newUrl = await uploadToCatbox(blob, filename)
        } catch (catErr) {
          console.warn('catbox failed, fallback cloudinary:', catErr)
          newUrl = await uploadToCloudinary(blob, cfg.folder)
          provider = 'cloudinary'
        }

        if (!dryRun) {
          await supabase.from(table).update({ [cfg.col]: newUrl }).eq('id', row.id)
        }
        results.push({ id: row.id, ok: true, provider, newUrl })
      } catch (e: any) {
        results.push({ id: row.id, ok: false, error: e?.message || String(e) })
      }
    }

    return new Response(JSON.stringify({
      table, processed: results.length, dryRun,
      success: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('[migrate-storage-to-catbox]', e)
    return new Response(JSON.stringify({ error: e?.message || 'Failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
