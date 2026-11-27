import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { renderToBuffer } from 'npm:@react-pdf/renderer@3.4.4'
import * as React from 'npm:react@18.3.1'
import { TransactionReceipt } from './_templates/transaction-receipt.tsx'
import { GeneralNotification } from './_templates/general-notification.tsx'
import { WelcomeEmail } from './_templates/welcome-email.tsx'
import { WeeklyDigest } from './_templates/weekly-digest.tsx'
import { JobAlert } from './_templates/job-alert.tsx'
import { EngagementEmail } from './_templates/engagement-email.tsx'
import { TransactionReceiptPDF } from './_utils/pdf-generator.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-function-token',
}


async function isInternalFunctionRequest(req: Request, client: any): Promise<boolean> {
  const token = req.headers.get('x-internal-function-token');
  if (!token || token.length < 32 || token.length > 256) return false;
  const { data, error } = await client.rpc('verify_internal_function_token', { p_token: token });
  return !error && data === true;
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}
function isServiceRoleRequest(req: Request): boolean {
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const provided = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return expected.length > 0 && constantTimeEquals(provided, expected);
}

interface NotificationRequest {
  userId: string
  type: string
  title: string
  message: string
  metadata?: any
  sendEmail?: boolean
  emailTemplate?: 'transaction' | 'general' | 'welcome' | 'weekly_digest' | 'job_alert' | 'engagement'
  attachPDF?: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      userId, 
      type, 
      title, 
      message, 
      metadata,
      sendEmail = false,
      emailTemplate = 'general',
      attachPDF = false
    } = await req.json() as NotificationRequest

    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId) || !type || type.length > 80 ||
        !title || title.length > 200 || !message || message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Invalid notification request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const internalRequest = isServiceRoleRequest(req) || await isInternalFunctionRequest(req, supabaseClient)
    if (!internalRequest) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      if (!token || !anonKey) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const authClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', anonKey)
      const { data: { user: actor }, error: authError } = await authClient.auth.getUser(token)
      let isAdmin = actor?.app_metadata?.role === 'admin' ||
        (Array.isArray(actor?.app_metadata?.roles) && actor.app_metadata.roles.includes('admin'))
      if (actor && !isAdmin) {
        const { data: roleRow } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', actor.id)
          .in('role', ['admin', 'super_admin'])
          .limit(1)
          .maybeSingle()
        isAdmin = !!roleRow
      }
      if (authError || !actor || (actor.id !== userId && !isAdmin)) {
        return new Response(JSON.stringify({ error: 'Not authorized to notify this user' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    console.log('Creating notification:', { userId, type, title, sendEmail })

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single()

    // Get user email from auth.users
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId)
    const userEmail = authUser?.user?.email

    // Insert notification in database
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }

    console.log('Notification created successfully:', data.id)

    // Send email if requested and user has email
    if (sendEmail && userEmail) {
      try {
        console.log('Sending email notification to:', userEmail)
        
        let html = ''
        let pdfAttachment = null

        // Generate email HTML based on template
        if (emailTemplate === 'transaction' && metadata) {
          html = await renderAsync(
            React.createElement(TransactionReceipt, {
              userName: profile?.full_name || 'User',
              transactionType: metadata.transactionType || type,
              amount: metadata.amount || 'N/A',
              reference: metadata.reference || 'N/A',
              date: new Date(data.created_at).toLocaleString(),
              status: metadata.status || 'Completed',
              description: message,
            })
          )

          // Generate PDF if requested
          if (attachPDF) {
            console.log('Generating PDF receipt...')
            const pdfDoc = React.createElement(TransactionReceiptPDF, {
              userName: profile?.full_name || 'User',
              transactionType: metadata.transactionType || type,
              amount: metadata.amount || 'N/A',
              reference: metadata.reference || 'N/A',
              date: new Date(data.created_at).toLocaleString(),
              status: metadata.status || 'Completed',
              description: message,
            })
            
            const pdfBuffer = await renderToBuffer(pdfDoc)
            pdfAttachment = {
              filename: `receipt-${metadata.reference || data.id}.pdf`,
              content: Array.from(new Uint8Array(pdfBuffer))
            }
          }
        } else if (emailTemplate === 'welcome') {
          html = await renderAsync(
            React.createElement(WelcomeEmail, {
              userName: profile?.full_name || 'User',
              referrerName: metadata?.referrerName,
              signupBonus: metadata?.signupBonus || 500,
            })
          )
        } else if (emailTemplate === 'weekly_digest' && metadata) {
          html = await renderAsync(
            React.createElement(WeeklyDigest, {
              userName: profile?.full_name || 'User',
              weekStartDate: metadata.weekStartDate,
              weekEndDate: metadata.weekEndDate,
              stats: metadata.stats || { profileViews: 0, connectionRequests: 0, newMessages: 0 },
              recommendedJobs: metadata.recommendedJobs || [],
              topExperts: metadata.topExperts || [],
              trendingSkills: metadata.trendingSkills || [],
            })
          )
        } else if (emailTemplate === 'job_alert' && metadata) {
          html = await renderAsync(
            React.createElement(JobAlert, {
              userName: profile?.full_name || 'User',
              alertType: metadata.alertType,
              jobTitle: metadata.jobTitle,
              applicantName: metadata.applicantName,
              applicantSkills: metadata.applicantSkills,
              proposalMessage: metadata.proposalMessage,
              budget: metadata.budget,
              deadline: metadata.deadline,
              applicationStatus: metadata.applicationStatus,
              actionUrl: metadata.actionUrl || 'https://naijalancers.name.ng/jobs',
            })
          )
        } else if (emailTemplate === 'engagement' && metadata) {
          html = await renderAsync(
            React.createElement(EngagementEmail, {
              userName: profile?.full_name || 'User',
              engagementType: metadata.engagementType,
              profileCompletion: metadata.profileCompletion,
              daysSinceLogin: metadata.daysSinceLogin,
              pendingReviewItem: metadata.pendingReviewItem,
              milestoneName: metadata.milestoneName,
              milestoneReward: metadata.milestoneReward,
              pendingAmount: metadata.pendingAmount,
              actionUrl: metadata.actionUrl || 'https://naijalancers.name.ng/dashboard',
            })
          )
        } else {
          html = await renderAsync(
            React.createElement(GeneralNotification, {
              userName: profile?.full_name || 'User',
              title,
              message,
              actionUrl: metadata?.actionUrl,
              actionText: metadata?.actionText,
            })
          )
        }

        // Send email via Resend
        const emailData: any = {
          from: 'NaijaLancers <notifications@naijalancers.name.ng>',
          to: [userEmail],
          subject: title,
          html,
        }

        if (pdfAttachment) {
          emailData.attachments = [pdfAttachment]
        }

        const { error: emailError } = await resend.emails.send(emailData)

        if (emailError) {
          console.error('Error sending email:', emailError)
        } else {
          console.log('Email sent successfully to:', userEmail)
        }
      } catch (emailError) {
        console.error('Error in email sending process:', emailError)
        // Don't fail the notification if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
