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

    console.log('========================================')
    console.log('[PUSH] Sending push notification')
    console.log('[PUSH] User ID:', userId)
    console.log('[PUSH] Title:', title)
    console.log('[PUSH] Body:', body)

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subError) {
      console.error('[PUSH] Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[PUSH] No push subscriptions found for user:', userId)
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[PUSH] Found', subscriptions.length, 'subscription(s)')

    // Use web-push library to send notifications
    const webpush = await import('npm:web-push@3.6.7')
    
    // VAPID keys - these should be configured in Supabase secrets
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BLpOlYmZrInf0zI1oSxqhGvAhSm3HEqVALjIvZtgoCXU-N59AX0SbjhLL3RF5aX-eG4A31uBFM2gkGYpVEtQdbw'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    
    if (!vapidPrivateKey) {
      console.error('[PUSH] VAPID_PRIVATE_KEY not configured in Supabase secrets')
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
    
    console.log('[PUSH] VAPID public key:', vapidPublicKey.substring(0, 20) + '...')
    console.log('[PUSH] VAPID private key configured:', !!vapidPrivateKey)

    webpush.setVapidDetails(
      'mailto:support@naijalancers.name.ng',
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

    console.log('[PUSH] Payload:', payload)

    // Send to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        console.log('[PUSH] Sending to subscription:', sub.id)
        console.log('[PUSH] Endpoint:', sub.endpoint?.substring(0, 50) + '...')
        
        // Build the subscription object from stored data
        const pushSubscription = sub.subscription || {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }
        
        await webpush.sendNotification(pushSubscription, payload)
        console.log('[PUSH] ✅ Sent successfully to:', sub.id)
        return { success: true, subscriptionId: sub.id }
      } catch (error: any) {
        console.error('[PUSH] ❌ Error sending to subscription:', sub.id)
        console.error('[PUSH] Status code:', error.statusCode)
        console.error('[PUSH] Message:', error.message)
        
        // If subscription is invalid (410 Gone or 404 Not Found), remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('[PUSH] Removing invalid subscription:', sub.id)
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

    console.log('[PUSH] Results:', successCount, '/', subscriptions.length, 'sent successfully')
    console.log('========================================')

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
    console.error('[PUSH] Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
