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

// Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
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
      .select('subscription')
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
    
    // VAPID keys - these should match the keys used in the frontend
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37gp65ImqH8IaG_d5zGW3TpUY0Dh3TGX2hP_mMLpYXLvJ4WdE_kCDZiQ8'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'your-private-key-here'
    
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
        console.log('Push notification sent successfully')
        return { success: true }
      } catch (error: any) {
        console.error('Error sending push notification:', error)
        
        // If subscription is invalid (410 Gone), remove it from database
        if (error.statusCode === 410) {
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('subscription', sub.subscription)
          console.log('Removed invalid subscription')
        }
        
        return { success: false, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length

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