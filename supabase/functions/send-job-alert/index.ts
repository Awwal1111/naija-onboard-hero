import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { JobAlert } from './_templates/job-alert.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobAlertRequest {
  recipientUserId: string
  alertType: 'new_application' | 'proposal_received' | 'job_match' | 'application_status'
  jobId: string
  jobTitle: string
  applicantId?: string
  applicantName?: string
  applicantSkills?: string[]
  proposalMessage?: string
  budget?: string
  deadline?: string
  applicationStatus?: 'accepted' | 'rejected' | 'shortlisted'
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

    const request = await req.json() as JobAlertRequest

    console.log('Processing job alert:', request.alertType, 'for job:', request.jobTitle)

    // Get recipient's profile and email
    const [profileResult, authResult] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('full_name, email_notifications')
        .eq('user_id', request.recipientUserId)
        .single(),
      supabaseClient.auth.admin.getUserById(request.recipientUserId)
    ])

    const profile = profileResult.data
    const userEmail = authResult.data?.user?.email

    if (!userEmail) {
      console.log('No email found for user:', request.recipientUserId)
      return new Response(
        JSON.stringify({ success: false, reason: 'no_email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has email notifications enabled
    if (profile?.email_notifications === false) {
      console.log('Email notifications disabled for user:', request.recipientUserId)
      return new Response(
        JSON.stringify({ success: false, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate action URL based on alert type
    const baseUrl = 'https://naijalancers.name.ng'
    let actionUrl = `${baseUrl}/jobs`
    
    if (request.alertType === 'new_application' || request.alertType === 'proposal_received') {
      actionUrl = `${baseUrl}/job/${request.jobId}`
    } else if (request.alertType === 'job_match') {
      actionUrl = `${baseUrl}/job/${request.jobId}`
    } else if (request.alertType === 'application_status') {
      actionUrl = `${baseUrl}/jobs?tab=applications`
    }

    // Render email
    const html = await renderAsync(
      React.createElement(JobAlert, {
        userName: profile?.full_name || 'User',
        alertType: request.alertType,
        jobTitle: request.jobTitle,
        applicantName: request.applicantName,
        applicantSkills: request.applicantSkills,
        proposalMessage: request.proposalMessage,
        budget: request.budget,
        deadline: request.deadline,
        applicationStatus: request.applicationStatus,
        actionUrl,
      })
    )

    // Determine email subject based on alert type
    const subjects: Record<string, string> = {
      new_application: `📬 New Application: ${request.jobTitle}`,
      proposal_received: `💼 New Proposal for: ${request.jobTitle}`,
      job_match: `🎯 Perfect Match: ${request.jobTitle}`,
      application_status: `📋 Application Update: ${request.jobTitle}`,
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'NaijaLancers <jobs@naijalancers.name.ng>',
      to: [userEmail],
      subject: subjects[request.alertType] || `Job Update: ${request.jobTitle}`,
      html,
    })

    if (error) {
      console.error('Error sending job alert email:', error)
      throw error
    }

    console.log('Job alert email sent successfully:', data?.id)

    // Also create in-app notification
    const notificationTitles: Record<string, string> = {
      new_application: `New application for "${request.jobTitle}"`,
      proposal_received: `New proposal for "${request.jobTitle}"`,
      job_match: `Job matching your skills: "${request.jobTitle}"`,
      application_status: `Application ${request.applicationStatus} for "${request.jobTitle}"`,
    }

    const notificationMessages: Record<string, string> = {
      new_application: `${request.applicantName} has applied to your job posting.`,
      proposal_received: `${request.applicantName} submitted a proposal for your project.`,
      job_match: `This job matches your skills. Apply now!`,
      application_status: `Your application has been ${request.applicationStatus}.`,
    }

    await supabaseClient.from('notifications').insert({
      user_id: request.recipientUserId,
      type: 'job_alert',
      title: notificationTitles[request.alertType],
      message: notificationMessages[request.alertType],
      metadata: {
        jobId: request.jobId,
        alertType: request.alertType,
        applicantId: request.applicantId,
        actionUrl,
      }
    })

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-job-alert:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
