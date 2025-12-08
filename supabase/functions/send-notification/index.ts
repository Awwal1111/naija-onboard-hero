import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { renderToBuffer } from 'npm:@react-pdf/renderer@3.4.4'
import * as React from 'npm:react@18.3.1'
import { TransactionReceipt } from './_templates/transaction-receipt.tsx'
import { GeneralNotification } from './_templates/general-notification.tsx'
import { TransactionReceiptPDF } from './_utils/pdf-generator.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string
  type: string
  title: string
  message: string
  metadata?: any
  sendEmail?: boolean
  emailTemplate?: 'transaction' | 'general'
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
              userName: profile.full_name || 'User',
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
              userName: profile.full_name || 'User',
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
        } else {
          html = await renderAsync(
            React.createElement(GeneralNotification, {
              userName: profile.full_name || 'User',
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
