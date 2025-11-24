import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationRequest {
  userId: string
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
  url?: string
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

    const { userId, title, body, icon, badge, data, url } = await req.json() as PushNotificationRequest

    console.log('Sending push notification to user:', userId)

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId)
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use web-push library to send notifications
    const webpush = await import('npm:web-push@3.6.7')
    
    // VAPID keys
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37gp65ImqH8IaG_d5zGW3TpUY0Dh3TGX2hP_mMLpYXLvJ4WdE_kCDZiQ8'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    
    if (!vapidPrivateKey) {
      console.error('VAPID_PRIVATE_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    webpush.setVapidDetails(
      'mailto:support@naijalancers.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      data: data || {},
      url: url || '/',
    })

    // Send to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        console.log('Push notification sent successfully to subscription')
        return { success: true, subscriptionId: sub.id }
      } catch (error: any) {
        console.error('Error sending push notification:', error)
        
        // If subscription is invalid (410 Gone), remove it from database
        if (error.statusCode === 410) {
          console.log('Removing invalid subscription:', sub.id)
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
        
        return { success: false, error: error.message, subscriptionId: sub.id }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length

    console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
