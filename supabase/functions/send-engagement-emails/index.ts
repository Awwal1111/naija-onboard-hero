import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { EngagementEmail } from './_templates/engagement-email.tsx'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting engagement email campaign...')

    const now = new Date()
    const baseUrl = 'https://naijalancers.name.ng'

    // 1. Find users with incomplete profiles (< 80% completion)
    const { data: incompleteProfiles } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, profile_completion, email_notifications')
      .lt('profile_completion', 80)
      .eq('email_notifications', true)
      .limit(50)

    // 2. Find users who haven't logged in for 7+ days
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    
    const { data: inactiveUsers } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, last_login, email_notifications')
      .lt('last_login', sevenDaysAgo.toISOString())
      .eq('email_notifications', true)
      .limit(30)

    // 3. Find users with pending reviews (completed orders without reviews)
    const { data: pendingReviews } = await supabaseClient
      .from('gig_orders')
      .select(`
        id,
        buyer_id,
        gig:gigs(title),
        profiles!gig_orders_buyer_id_fkey(full_name, email_notifications)
      `)
      .eq('status', 'completed')
      .is('buyer_review', null)
      .limit(20)

    let sentCount = 0
    let errorCount = 0

    // Process incomplete profiles
    for (const user of incompleteProfiles || []) {
      try {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.user_id)
        const email = authUser?.user?.email
        if (!email) continue

        const html = await renderAsync(
          React.createElement(EngagementEmail, {
            userName: user.full_name || 'User',
            engagementType: 'incomplete_profile',
            profileCompletion: user.profile_completion || 0,
            actionUrl: `${baseUrl}/profile`,
          })
        )

        const { error } = await resend.emails.send({
          from: 'NaijaLancers <notifications@naijalancers.name.ng>',
          to: [email],
          subject: `👤 Your profile is ${user.profile_completion || 0}% complete - finish it to get more jobs!`,
          html,
        })

        if (!error) sentCount++
        else errorCount++

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        errorCount++
      }
    }

    // Process inactive users
    for (const user of inactiveUsers || []) {
      try {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.user_id)
        const email = authUser?.user?.email
        if (!email) continue

        const lastLogin = new Date(user.last_login)
        const daysSince = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))

        const html = await renderAsync(
          React.createElement(EngagementEmail, {
            userName: user.full_name || 'User',
            engagementType: 'no_activity',
            daysSinceLogin: daysSince,
            actionUrl: `${baseUrl}/dashboard`,
          })
        )

        const { error } = await resend.emails.send({
          from: 'NaijaLancers <notifications@naijalancers.name.ng>',
          to: [email],
          subject: `👋 We miss you! New opportunities are waiting`,
          html,
        })

        if (!error) sentCount++
        else errorCount++

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        errorCount++
      }
    }

    // Process pending reviews
    for (const order of pendingReviews || []) {
      try {
        if (!order.profiles?.email_notifications) continue
        
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(order.buyer_id)
        const email = authUser?.user?.email
        if (!email) continue

        const gigTitle = (order.gig as any)?.title || 'your order'

        const html = await renderAsync(
          React.createElement(EngagementEmail, {
            userName: order.profiles?.full_name || 'User',
            engagementType: 'pending_review',
            pendingReviewItem: gigTitle,
            actionUrl: `${baseUrl}/orders/${order.id}`,
          })
        )

        const { error } = await resend.emails.send({
          from: 'NaijaLancers <notifications@naijalancers.name.ng>',
          to: [email],
          subject: `⭐ Rate your experience with "${gigTitle}"`,
          html,
        })

        if (!error) sentCount++
        else errorCount++

        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        errorCount++
      }
    }

    console.log(`Engagement emails complete: ${sentCount} sent, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        breakdown: {
          incompleteProfiles: incompleteProfiles?.length || 0,
          inactiveUsers: inactiveUsers?.length || 0,
          pendingReviews: pendingReviews?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-engagement-emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
