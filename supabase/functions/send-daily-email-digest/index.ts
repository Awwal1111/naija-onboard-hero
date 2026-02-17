import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[DAILY_EMAIL] Starting daily email digest...')

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString()

    // Get users with email notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, full_name, user_mode, wallet_balance, email_notifications')
      .eq('email_notifications', true)

    if (usersError) throw usersError

    console.log(`[DAILY_EMAIL] Found ${users?.length || 0} users with email enabled`)

    // Get new jobs posted today for recommendations
    const { data: newJobs } = await supabase
      .from('job_posts')
      .select('title, budget')
      .eq('status', 'open')
      .gte('created_at', yesterdayStr)
      .limit(5)

    let sentCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const user of users || []) {
      try {
        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id)
        const email = authUser?.user?.email
        if (!email) continue

        // Get yesterday's activity
        const [messagesRes, connectionsRes, viewsRes, transactionsRes] = await Promise.all([
          supabase.from('messages').select('id', { count: 'exact', head: true })
            .neq('sender_id', user.user_id)
            .gte('created_at', yesterdayStr),
          supabase.from('connection_requests').select('id', { count: 'exact', head: true })
            .eq('requested_id', user.user_id)
            .gte('created_at', yesterdayStr),
          supabase.from('post_views').select('id', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .gte('viewed_at', yesterdayStr),
          supabase.from('wallet_transactions').select('amount')
            .eq('user_id', user.user_id)
            .eq('status', 'completed')
            .gte('created_at', yesterdayStr)
        ])

        const newMessages = messagesRes.count || 0
        const newConnections = connectionsRes.count || 0
        const profileViews = viewsRes.count || 0
        const earnings = (transactionsRes.data || [])
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0)

        const hasActivity = newMessages > 0 || newConnections > 0 || profileViews > 0 || earnings > 0
        const hasNewJobs = (newJobs?.length || 0) > 0

        // Skip if zero activity AND no new jobs
        if (!hasActivity && !hasNewJobs) {
          skippedCount++
          continue
        }

        // Build email - LinkedIn style: concise, actionable, personal
        const firstName = user.full_name?.split(' ')[0] || 'there'
        const baseUrl = 'https://naijalancers.name.ng'

        let activityHTML = ''

        if (newMessages > 0) {
          activityHTML += `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 20px;">💬</span>
                <strong style="color: #059669; margin-left: 8px;">${newMessages}</strong>
                <span style="color: #374151; margin-left: 4px;">new message${newMessages > 1 ? 's' : ''}</span>
                <a href="${baseUrl}/chats" style="float: right; color: #059669; text-decoration: none; font-weight: 600;">Reply →</a>
              </td>
            </tr>`
        }

        if (newConnections > 0) {
          activityHTML += `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 20px;">🤝</span>
                <strong style="color: #059669; margin-left: 8px;">${newConnections}</strong>
                <span style="color: #374151; margin-left: 4px;">connection request${newConnections > 1 ? 's' : ''}</span>
                <a href="${baseUrl}/connections" style="float: right; color: #059669; text-decoration: none; font-weight: 600;">View →</a>
              </td>
            </tr>`
        }

        if (profileViews > 0) {
          activityHTML += `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 20px;">👀</span>
                <strong style="color: #059669; margin-left: 8px;">${profileViews}</strong>
                <span style="color: #374151; margin-left: 4px;">people viewed your profile</span>
              </td>
            </tr>`
        }

        if (earnings > 0) {
          activityHTML += `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 20px;">💰</span>
                <strong style="color: #059669; margin-left: 8px;">₦${earnings.toLocaleString()} NC</strong>
                <span style="color: #374151; margin-left: 4px;">earned yesterday</span>
              </td>
            </tr>`
        }

        // New jobs section
        let jobsHTML = ''
        if (hasNewJobs && newJobs) {
          jobsHTML = `
            <div style="margin-top: 24px;">
              <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px;">🆕 New Jobs for You</h3>
              ${newJobs.map(job => `
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
                  <strong style="color: #111827;">${job.title}</strong>
                  <span style="color: #059669; float: right;">₦${job.budget?.toLocaleString() || 'Negotiable'}</span>
                </div>
              `).join('')}
              <div style="text-align: center; margin-top: 12px;">
                <a href="${baseUrl}/jobs" style="color: #059669; text-decoration: none; font-weight: 600;">
                  Browse all jobs →
                </a>
              </div>
            </div>`
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">📊 Your Daily Update</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>

              <div style="padding: 24px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
                  Hi ${firstName} 👋, here's what happened yesterday:
                </p>

                ${activityHTML ? `
                  <table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 8px; overflow: hidden;">
                    ${activityHTML}
                  </table>
                ` : ''}

                ${!hasActivity ? `
                  <div style="text-align: center; padding: 20px; background: #fafafa; border-radius: 8px;">
                    <p style="color: #6b7280; margin: 0;">No new activity yesterday — but new opportunities are waiting!</p>
                  </div>
                ` : ''}

                ${jobsHTML}

                <div style="text-align: center; margin-top: 28px;">
                  <a href="${baseUrl}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Open Dashboard
                  </a>
                </div>
              </div>

              <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} NaijaLancers • <a href="${baseUrl}/settings" style="color: #9ca3af;">Manage preferences</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `

        // Compose subject line like LinkedIn
        let subject = ''
        if (newMessages > 0) {
          subject = `💬 You have ${newMessages} unread message${newMessages > 1 ? 's' : ''} on NaijaLancers`
        } else if (newConnections > 0) {
          subject = `🤝 ${newConnections} people want to connect with you`
        } else if (profileViews > 0) {
          subject = `👀 ${profileViews} people viewed your profile this week`
        } else if (hasNewJobs) {
          subject = `🆕 ${newJobs?.length} new jobs matching your skills`
        } else {
          subject = `📊 Your daily NaijaLancers update`
        }

        const { error: emailError } = await resend.emails.send({
          from: 'NaijaLancers <notifications@naijalancers.name.ng>',
          to: [email],
          subject,
          html,
        })

        if (emailError) {
          console.error(`[DAILY_EMAIL] Failed for ${email}:`, emailError)
          errorCount++
        } else {
          sentCount++
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (userError) {
        console.error(`[DAILY_EMAIL] Error for ${user.user_id}:`, userError)
        errorCount++
      }
    }

    console.log(`[DAILY_EMAIL] Complete: ${sentCount} sent, ${errorCount} errors, ${skippedCount} skipped`)

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount, skipped: skippedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[DAILY_EMAIL] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
