import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { WelcomeEmail } from './_templates/welcome-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailRequest {
  userId: string
  email: string
  fullName: string
  referrerName?: string
  signupBonus?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      userId, 
      email, 
      fullName, 
      referrerName, 
      signupBonus = 500 
    } = await req.json() as WelcomeEmailRequest

    console.log('Sending welcome email to:', email)

    // Render the welcome email template
    const html = await renderAsync(
      React.createElement(WelcomeEmail, {
        userName: fullName || 'Friend',
        referrerName,
        signupBonus,
      })
    )

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'NaijaLancers <notifications@naijalancers.name.ng>',
      to: [email],
      subject: '🎉 Welcome to NaijaLancers - Your Freelance Journey Starts Now!',
      html,
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      throw error
    }

    console.log('Welcome email sent successfully:', data?.id)

    // Also create an in-app notification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient.from('notifications').insert({
      user_id: userId,
      type: 'welcome',
      title: 'Welcome to NaijaLancers! 🎉',
      message: `${signupBonus > 0 ? `You've received ${signupBonus} NC as a welcome bonus. ` : ''}Complete your profile to start getting job opportunities.`,
      metadata: { signupBonus, referrerName }
    })

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-welcome-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
