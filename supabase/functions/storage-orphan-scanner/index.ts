// Admin-only: scans a Supabase Storage bucket for orphaned files (objects
// not referenced by any DB row) and optionally deletes them in bulk.
//
// POST body:
//  { action: 'scan', bucket: string, prefix?: string, olderThanDays?: number, limit?: number }
//  { action: 'delete', bucket: string, paths: string[] }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Maps bucket → list of (table, column, isArray) that may reference its files.
const REF_MAP: Record<string, Array<{ table: string; col: string; isArray?: boolean }>> = {
  profiles: [{ table: 'profiles', col: 'profile_picture_url' }],
  avatars: [{ table: 'profiles', col: 'profile_picture_url' }],
  stories: [{ table: 'stories', col: 'media_url' }],
  portfolio: [{ table: 'portfolio_items', col: 'media_url' }],
  'portfolio-items': [{ table: 'portfolio_items', col: 'media_url' }],
  posts: [{ table: 'posts', col: 'media_urls', isArray: true }],
  gigs: [{ table: 'jobs_services', col: 'photo_urls', isArray: true }],
  'jobs-services': [{ table: 'jobs_services', col: 'photo_urls', isArray: true }],
  articles: [{ table: 'articles', col: 'cover_image_url' }],
  courses: [{ table: 'courses', col: 'thumbnail_url' }],
  'training-files': [],
}

async function listAllObjects(supabase: any, bucket: string, prefix: string | undefined, maxFiles: number) {
  const all: any[] = []
  const pageSize = 1000
  let offset = 0
  while (all.length < maxFiles) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix || '', {
      limit: pageSize,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return all.slice(0, maxFiles)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const auth = req.headers.get("authorization")
    if (!auth) throw new Error("No authorization")
    const { data: { user }, error: authErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""))
    if (authErr || !user) throw new Error("Unauthorized")
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).limit(5)
    const isAdmin = (roles || []).some((r: any) => ['admin', 'super_admin', 'moderator'].includes(r.role))
    if (!isAdmin) throw new Error("Admin only")

    const body = await req.json()
    const action = String(body.action || 'scan')

    if (action === 'delete') {
      const bucket = String(body.bucket || '')
      const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 1000) : []
      if (!bucket || paths.length === 0) throw new Error('bucket and paths required')
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, deleted: paths.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // scan
    const bucket = String(body.bucket || '')
    const prefix = body.prefix ? String(body.prefix) : undefined
    const olderThanDays = Number(body.olderThanDays ?? 7)
    const limit = Math.min(Math.max(Number(body.limit) || 500, 1), 2000)
    if (!bucket) throw new Error('bucket required')

    const refs = REF_MAP[bucket] || []

    // Build a Set of referenced filenames/paths (basename match — Catbox URLs
    // don't contain the supabase path so we use basename which is unique enough
    // given timestamp-prefixed filenames).
    const referenced = new Set<string>()
    for (const r of refs) {
      let from = 0
      const page = 1000
      while (true) {
        const { data, error } = await supabase
          .from(r.table)
          .select(r.col)
          .range(from, from + page - 1)
        if (error) break
        if (!data || data.length === 0) break
        for (const row of data) {
          const val = (row as any)[r.col]
          const urls: string[] = r.isArray ? (Array.isArray(val) ? val : []) : (val ? [val] : [])
          for (const u of urls) {
            if (typeof u !== 'string') continue
            // Extract basename
            const base = u.split('?')[0].split('/').pop()
            if (base) referenced.add(base)
          }
        }
        if (data.length < page) break
        from += page
      }
    }

    // List objects in bucket (top-level + per-user folders). Since Storage list
    // is per-folder, walk one level deep (user_id folders).
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    const orphans: Array<{ path: string; size: number; createdAt: string }> = []
    let totalScanned = 0
    let totalBytes = 0

    const topLevel = await listAllObjects(supabase, bucket, prefix, limit)
    for (const item of topLevel) {
      if (orphans.length >= limit) break
      if (item.id === null && item.name) {
        // It's a folder — list inside
        const inner = await listAllObjects(supabase, bucket, (prefix ? `${prefix}/` : '') + item.name, limit - orphans.length)
        for (const f of inner) {
          if (f.id === null) continue
          totalScanned++
          const size = Number(f.metadata?.size || 0)
          const created = f.created_at || f.updated_at || new Date().toISOString()
          if (new Date(created).getTime() > cutoff) continue
          if (referenced.has(f.name)) continue
          orphans.push({ path: `${item.name}/${f.name}`, size, createdAt: created })
          totalBytes += size
          if (orphans.length >= limit) break
        }
      } else {
        totalScanned++
        const size = Number(item.metadata?.size || 0)
        const created = item.created_at || item.updated_at || new Date().toISOString()
        if (new Date(created).getTime() > cutoff) continue
        if (referenced.has(item.name)) continue
        orphans.push({ path: (prefix ? `${prefix}/` : '') + item.name, size, createdAt: created })
        totalBytes += size
      }
    }

    return new Response(JSON.stringify({
      bucket,
      scanned: totalScanned,
      orphanCount: orphans.length,
      totalBytes,
      referenceTablesChecked: refs.length,
      orphans,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('[storage-orphan-scanner]', e)
    return new Response(JSON.stringify({ error: e?.message || 'Failed' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
