import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { WeeklyDigest } from './_templates/weekly-digest.tsx'

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

    console.log('Starting weekly digest email send...')

    // Get week date range
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const weekStartDate = weekStart.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
    const weekEndDate = now.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })

    // Get all active users with email notifications enabled
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, user_mode, skills')
      .eq('email_notifications', true)

    if (usersError) throw usersError

    console.log(`Found ${users?.length || 0} users to send digest to`)

    // Get trending skills (most applied-for in job posts)
    const { data: trendingJobs } = await supabaseClient
      .from('job_posts')
      .select('required_skills')
      .gte('created_at', weekStart.toISOString())
      .limit(50)

    const skillCount: Record<string, number> = {}
    trendingJobs?.forEach(job => {
      (job.required_skills || []).forEach((skill: string) => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
    })
    const trendingSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill)

    // Get top experts this week (for both freelancers to network and clients to hire)
    const { data: topExperts } = await supabaseClient
      .from('profiles')
      .select('full_name, expertise, average_rating')
      .eq('is_expert', true)
      .order('average_rating', { ascending: false })
      .limit(5)

    // Get top freelancers for clients
    const { data: topFreelancers } = await supabaseClient
      .from('profiles')
      .select('full_name, profession, average_rating')
      .or('user_mode.eq.freelancer,user_mode.eq.both')
      .order('average_rating', { ascending: false })
      .limit(5)

    let sentCount = 0
    let errorCount = 0

    for (const user of users || []) {
      try {
        // Get user's email
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.user_id)
        const userEmail = authUser?.user?.email
        
        if (!userEmail) continue

        // Determine user mode (default to 'both' if not set)
        const userMode = (user.user_mode as 'freelancer' | 'client' | 'both') || 'both'
        const isFreelancer = userMode === 'freelancer' || userMode === 'both'
        const isClient = userMode === 'client' || userMode === 'both'

        // Get user-specific stats
        const statsPromises = [
          supabaseClient
            .from('post_views')
            .select('id', { count: 'exact' })
            .eq('user_id', user.user_id)
            .gte('viewed_at', weekStart.toISOString()),
          supabaseClient
            .from('connection_requests')
            .select('id', { count: 'exact' })
            .eq('requested_id', user.user_id)
            .gte('created_at', weekStart.toISOString()),
          supabaseClient
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('receiver_id', user.user_id)
            .gte('created_at', weekStart.toISOString()),
        ]

        // Freelancer-specific: earnings
        if (isFreelancer) {
          statsPromises.push(
            supabaseClient
              .from('transactions')
              .select('amount')
              .eq('user_id', user.user_id)
              .eq('type', 'credit')
              .gte('created_at', weekStart.toISOString())
          )
        }

        // Client-specific: jobs posted and applications received
        if (isClient) {
          statsPromises.push(
            supabaseClient
              .from('job_posts')
              .select('id', { count: 'exact' })
              .eq('client_id', user.user_id)
              .gte('created_at', weekStart.toISOString()),
            supabaseClient
              .from('job_applications')
              .select('id, job_posts!inner(client_id)', { count: 'exact' })
              .eq('job_posts.client_id', user.user_id)
              .gte('created_at', weekStart.toISOString())
          )
        }

        const results = await Promise.all(statsPromises)
        
        const [profileViews, connectionRequests, messages] = results.slice(0, 3)
        const earnings = isFreelancer && results[3] 
          ? (results[3].data as any[])?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0 
          : 0
        
        let jobsPosted = 0
        let applicationsReceived = 0
        if (isClient) {
          const clientStatsStart = isFreelancer ? 4 : 3
          jobsPosted = results[clientStatsStart]?.count || 0
          applicationsReceived = results[clientStatsStart + 1]?.count || 0
        }

        // Get recommended jobs for freelancers
        let jobsForEmail: any[] = []
        if (isFreelancer) {
          const userSkills = user.skills || []
          const { data: recommendedJobs } = await supabaseClient
            .from('job_posts')
            .select('title, budget, required_skills')
            .eq('status', 'open')
            .limit(3)

          jobsForEmail = recommendedJobs?.map(job => ({
            title: job.title,
            budget: `₦${job.budget?.toLocaleString() || 'Negotiable'}`,
            skills: job.required_skills?.slice(0, 3) || [],
          })) || []
        }

        const expertsForEmail = topExperts?.map(exp => ({
          name: exp.full_name || 'Expert',
          skill: exp.expertise || 'Freelancer',
          rating: exp.average_rating || 4.5,
        })) || []

        const freelancersForEmail = topFreelancers?.map(f => ({
          name: f.full_name || 'Freelancer',
          expertise: f.profession || 'Professional',
          rating: f.average_rating || 4.5,
        })) || []

        // Render email with role-specific content
        const html = await renderAsync(
          React.createElement(WeeklyDigest, {
            userName: user.full_name || 'User',
            weekStartDate,
            weekEndDate,
            userMode,
            stats: {
              profileViews: profileViews.count || 0,
              connectionRequests: connectionRequests.count || 0,
              newMessages: messages.count || 0,
              earnings: isFreelancer ? earnings : undefined,
              jobsPosted: isClient ? jobsPosted : undefined,
              applicationsReceived: isClient ? applicationsReceived : undefined,
            },
            recommendedJobs: jobsForEmail,
            topExperts: expertsForEmail,
            trendingSkills,
            topFreelancers: isClient ? freelancersForEmail : [],
            recentApplications: applicationsReceived,
          })
        )

        // Customize subject line based on user mode
        const subjectLine = userMode === 'client' 
          ? `📊 Your Weekly Client Digest - ${weekStartDate} to ${weekEndDate}`
          : userMode === 'freelancer'
          ? `📊 Your Weekly Freelancer Digest - ${weekStartDate} to ${weekEndDate}`
          : `📊 Your Weekly Digest - ${weekStartDate} to ${weekEndDate}`

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: 'NaijaLancers <digest@naijalancers.name.ng>',
          to: [userEmail],
          subject: subjectLine,
          html,
        })

        if (emailError) {
          console.error(`Error sending to ${userEmail}:`, emailError)
          errorCount++
        } else {
          sentCount++
        }

        // Rate limiting - small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError)
        errorCount++
      }
    }

    console.log(`Weekly digest complete: ${sentCount} sent, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        totalUsers: users?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in weekly digest:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
