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
    
    // VAPID keys - these should be configured in Supabase secrets
    // Using correct VAPID public key that matches the private key
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BLpOlYmZrInf0zI1oSxqhGvAhSm3HEqVALjIvZtgoCXU-N59AX0SbjhLL3RF5aX-eG4A31uBFM2gkGYpVEtQdbw'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    
    if (!vapidPrivateKey) {
      console.error('VAPID_PRIVATE_KEY not configured in Supabase secrets')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'VAPID keys not configured. Please add VAPID_PRIVATE_KEY to Supabase secrets.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    console.log('Using VAPID public key:', vapidPublicKey.substring(0, 20) + '...')
    console.log('VAPID private key configured:', !!vapidPrivateKey)

    webpush.setVapidDetails(
      'mailto:support@naijalancers.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icon-512.png',
      badge: badge || '/icon-512.png',
      data: data || {},
      url: url || '/main-feed',
    })

    // Send to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        console.log('Sending notification to subscription:', {
          id: sub.id,
          endpoint: sub.endpoint?.substring(0, 50) + '...',
          hasSubscription: !!sub.subscription
        })
        
        await webpush.sendNotification(sub.subscription, payload)
        console.log('Push notification sent successfully to subscription:', sub.id)
        return { success: true, subscriptionId: sub.id }
      } catch (error: any) {
        console.error('Error sending push notification:', {
          subscriptionId: sub.id,
          statusCode: error.statusCode,
          message: error.message,
          body: error.body
        })
        
        // If subscription is invalid (410 Gone or 404 Not Found), remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('Removing invalid subscription:', sub.id)
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
        
        return { 
          success: false, 
          error: error.message, 
          statusCode: error.statusCode,
          subscriptionId: sub.id 
        }
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
