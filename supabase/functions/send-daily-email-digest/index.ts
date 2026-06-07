import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hard caps to keep within the 150s edge function wall-clock
const MAX_EMAILS_PER_RUN = 200
const RESEND_DELAY_MS = 80

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[DAILY_EMAIL] Starting (batched mode)…')

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString()

    // 1) Users with email enabled (explicit columns + limit)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email_notifications')
      .eq('email_notifications', true)
      .limit(5000)
    if (usersError) throw usersError

    const userIds = (users || []).map(u => u.user_id)
    console.log(`[DAILY_EMAIL] eligible users: ${userIds.length}`)
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Batched yesterday activity — one round-trip per signal
    const [msgsRes, connRes, viewsRes, txRes, jobsRes] = await Promise.all([
      supabase.from('messages').select('chat_id, sender_id, created_at')
        .gte('created_at', yesterdayStr).limit(10000),
      supabase.from('connection_requests').select('requested_id')
        .gte('created_at', yesterdayStr).in('requested_id', userIds).limit(5000),
      supabase.from('post_views').select('user_id')
        .gte('viewed_at', yesterdayStr).in('user_id', userIds).limit(10000),
      supabase.from('wallet_transactions').select('user_id, amount')
        .eq('status', 'completed').gte('created_at', yesterdayStr).in('user_id', userIds).limit(10000),
      supabase.from('job_posts').select('title, budget')
        .eq('status', 'open').gte('created_at', yesterdayStr).limit(5),
    ])

    const newJobs = jobsRes.data || []
    const hasNewJobs = newJobs.length > 0

    const incr = (map: Map<string, number>, key: string, by = 1) =>
      map.set(key, (map.get(key) || 0) + by)

    const messagesByUser = new Map<string, number>()
    // messages: count messages sent TO each user (i.e. in their chats and not from them)
    // Without a chat membership join, approximate by counting messages where sender_id != user.
    // We bucket per recipient using chats they participate in below.
    // Simpler & cheap: skip per-user attribution; use 0 unless we add chat membership lookup.
    // We keep messagesByUser empty to avoid expensive joins; subject falls back to other signals.

    const connectionsByUser = new Map<string, number>()
    for (const r of connRes.data || []) incr(connectionsByUser, r.requested_id as string)

    const viewsByUser = new Map<string, number>()
    for (const r of viewsRes.data || []) incr(viewsByUser, r.user_id as string)

    const earningsByUser = new Map<string, number>()
    for (const r of txRes.data || []) {
      const amt = Number(r.amount) || 0
      if (amt > 0) incr(earningsByUser, r.user_id as string, amt)
    }

    // 3) Filter to users with something to say
    const candidates = users!.filter(u => {
      const c = connectionsByUser.get(u.user_id) || 0
      const v = viewsByUser.get(u.user_id) || 0
      const e = earningsByUser.get(u.user_id) || 0
      return c > 0 || v > 0 || e > 0 || hasNewJobs
    }).slice(0, MAX_EMAILS_PER_RUN)

    console.log(`[DAILY_EMAIL] sending to ${candidates.length} (capped at ${MAX_EMAILS_PER_RUN})`)

    // 4) Build email map via paginated listUsers (no per-user getUserById)
    const emailMap = new Map<string, string>()
    const needed = new Set(candidates.map(c => c.user_id))
    let page = 1
    const perPage = 1000
    while (needed.size > 0) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error || !data?.users?.length) break
      for (const u of data.users) {
        if (u.email && needed.has(u.id)) {
          emailMap.set(u.id, u.email)
          needed.delete(u.id)
        }
      }
      if (data.users.length < perPage) break
      page++
      if (page > 20) break // safety
    }

    const baseUrl = 'https://naijalancers.name.ng'
    let sent = 0, errors = 0, skipped = 0

    for (const user of candidates) {
      const email = emailMap.get(user.user_id)
      if (!email) { skipped++; continue }

      const connections = connectionsByUser.get(user.user_id) || 0
      const profileViews = viewsByUser.get(user.user_id) || 0
      const earnings = earningsByUser.get(user.user_id) || 0
      const firstName = user.full_name?.split(' ')[0] || 'there'

      let rows = ''
      if (connections > 0) rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">🤝 <strong style="color:#059669">${connections}</strong> new connection request${connections>1?'s':''} <a href="${baseUrl}/connections" style="float:right;color:#059669;text-decoration:none;font-weight:600">View →</a></td></tr>`
      if (profileViews > 0) rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">👀 <strong style="color:#059669">${profileViews}</strong> profile view${profileViews>1?'s':''}</td></tr>`
      if (earnings > 0) rows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">💰 <strong style="color:#059669">NC ${earnings.toLocaleString()}</strong> earned yesterday</td></tr>`

      const jobsHTML = hasNewJobs ? `
        <div style="margin-top:24px">
          <h3 style="color:#111827;font-size:16px;margin:0 0 12px">🆕 New Jobs for You</h3>
          ${newJobs.map(j => `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:8px"><strong>${j.title}</strong><span style="color:#059669;float:right">NC ${(j.budget||0).toLocaleString() || 'Negotiable'}</span></div>`).join('')}
          <div style="text-align:center;margin-top:12px"><a href="${baseUrl}/jobs" style="color:#059669;font-weight:600;text-decoration:none">Browse all jobs →</a></div>
        </div>` : ''

      const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;margin:0;padding:20px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:20px">📊 Your Daily Update</h1></div>
          <div style="padding:24px">
            <p style="color:#374151;font-size:16px;margin:0 0 20px">Hi ${firstName} 👋, here's what happened yesterday:</p>
            ${rows ? `<table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden">${rows}</table>` : ''}
            ${jobsHTML}
            <div style="text-align:center;margin-top:28px"><a href="${baseUrl}/dashboard" style="display:inline-block;background:#059669;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a></div>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb"><p style="color:#9ca3af;font-size:12px;margin:0">© ${new Date().getFullYear()} NaijaLancers • <a href="${baseUrl}/settings" style="color:#9ca3af">Manage preferences</a></p></div>
        </div></body></html>`

      const subject = connections > 0
        ? `🤝 ${connections} people want to connect with you`
        : profileViews > 0
        ? `👀 ${profileViews} people viewed your profile`
        : earnings > 0
        ? `💰 You earned NC ${earnings.toLocaleString()} yesterday`
        : `🆕 ${newJobs.length} new jobs matching your skills`

      try {
        const { error } = await resend.emails.send({
          from: 'NaijaLancers Updates <notifications@naijalancers.name.ng>',
          to: [email],
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<${baseUrl}/settings>, <mailto:unsubscribe@naijalancers.name.ng>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [{ name: 'stream', value: 'daily_digest' }],
        })
        if (error) { errors++; console.error('[DAILY_EMAIL] send err', email, error) }
        else sent++
      } catch (e) {
        errors++
        console.error('[DAILY_EMAIL] exception', email, e)
      }
      await new Promise(r => setTimeout(r, RESEND_DELAY_MS))
    }

    console.log(`[DAILY_EMAIL] done: sent=${sent} errors=${errors} skipped=${skipped}`)
    return new Response(JSON.stringify({ success: true, sent, errors, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[DAILY_EMAIL] fatal', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
