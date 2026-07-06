// Migrates legacy public Supabase Storage objects to Catbox and rewrites all
// DB references, then deletes the Supabase object to stop egress bleeding.
//
// Admin-only. Processes ONE bucket per invocation, up to `limit` files.
// Returns progress so the admin UI can loop until done.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BucketMap {
  // columns of type text
  textColumns?: { table: string; column: string }[]
  // columns of type text[]
  arrayColumns?: { table: string; column: string }[]
}

// Which DB columns may contain URLs for each bucket. Kept broad and safe —
// each rewrite is a `like` scan bounded by the exact old public URL.
const BUCKET_TARGETS: Record<string, BucketMap> = {
  profiles: {
    textColumns: [
      { table: 'profiles', column: 'profile_picture_url' },
      { table: 'profiles', column: 'intro_video_url' },
    ],
  },
  Feed: {
    arrayColumns: [{ table: 'posts', column: 'media_urls' }],
    textColumns: [
      { table: 'messages', column: 'media_url' },
      { table: 'group_messages', column: 'media_url' },
    ],
  },
  'gig-images': {
    arrayColumns: [{ table: 'jobs_services', column: 'photo_urls' }],
  },
  portfolio: {
    textColumns: [{ table: 'portfolio_items', column: 'media_url' }],
  },
  stories: {
    textColumns: [{ table: 'stories', column: 'media_url' }],
  },
}

async function uploadToCatbox(bytes: Uint8Array, filename: string, mime: string): Promise<string> {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', new Blob([bytes], { type: mime }), filename)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, signal: ctrl.signal })
    if (!res.ok) throw new Error(`catbox HTTP ${res.status}`)
    const url = (await res.text()).trim()
    if (!url.startsWith('https://files.catbox.moe/')) throw new Error(`bad catbox response: ${url.slice(0, 80)}`)
    return url
  } finally {
    clearTimeout(t)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const bucket = url.searchParams.get('bucket') || ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 25)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    if (!BUCKET_TARGETS[bucket]) {
      return new Response(JSON.stringify({ error: `unknown bucket: ${bucket}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userRes } = await userClient.auth.getUser()
    if (!userRes.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: isAdmin } = await admin.rpc('has_admin_access', { _user_id: userRes.user.id })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // List objects (paginated)
    const { data: objects, error: listErr } = await admin
      .schema('storage')
      .from('objects')
      .select('id, name, bucket_id, metadata')
      .eq('bucket_id', bucket)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
    if (listErr) throw listErr

    const targets = BUCKET_TARGETS[bucket]
    const results: any[] = []

    for (const obj of objects || []) {
      const path = obj.name as string
      const oldPublicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
      try {
        // Download from storage
        const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(path)
        if (dlErr || !blob) throw new Error(dlErr?.message || 'download failed')
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (bytes.length === 0) {
          // empty placeholder — just delete
          await admin.storage.from(bucket).remove([path])
          results.push({ path, status: 'deleted_empty' })
          continue
        }
        const mime = (obj.metadata as any)?.mimetype || blob.type || 'application/octet-stream'
        const filename = path.split('/').pop() || 'file'

        // Upload to Catbox
        const newUrl = await uploadToCatbox(bytes, filename, mime)

        // Rewrite text columns
        let rewrites = 0
        for (const c of targets.textColumns || []) {
          const { data: rows } = await admin
            .from(c.table).select('id').eq(c.column, oldPublicUrl).limit(500)
          for (const r of rows || []) {
            await admin.from(c.table).update({ [c.column]: newUrl }).eq('id', r.id)
            rewrites++
          }
        }
        // Rewrite array columns (text[])
        for (const c of targets.arrayColumns || []) {
          const { data: rows } = await admin
            .from(c.table).select(`id, ${c.column}`).contains(c.column, [oldPublicUrl]).limit(500)
          for (const r of rows || []) {
            const arr: string[] = (r as any)[c.column] || []
            const next = arr.map((v) => (v === oldPublicUrl ? newUrl : v))
            await admin.from(c.table).update({ [c.column]: next }).eq('id', r.id)
            rewrites++
          }
        }

        // Delete storage object last
        await admin.storage.from(bucket).remove([path])
        results.push({ path, status: 'migrated', rewrites, new_url: newUrl, bytes: bytes.length })
      } catch (e: any) {
        results.push({ path, status: 'error', error: String(e?.message || e) })
      }
    }

    return new Response(JSON.stringify({
      bucket, offset, processed: results.length, results,
      next_offset: (objects?.length || 0) === limit ? offset + limit : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
