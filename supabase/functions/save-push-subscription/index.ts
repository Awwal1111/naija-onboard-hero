import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaveSubscriptionRequest {
  subscription: {
    endpoint: string
    expirationTime?: number | null
    keys: {
      p256dh: string
      auth: string
    }
  }
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { subscription } = await req.json() as SaveSubscriptionRequest

    console.log('Saving push subscription for user:', user.id)
    console.log('Subscription details:', {
      endpoint: subscription.endpoint,
      hasP256dh: !!subscription.keys?.p256dh,
      hasAuth: !!subscription.keys?.auth,
      expirationTime: subscription.expirationTime
    })

    // Validate subscription data
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid subscription data',
          details: 'Missing required fields: endpoint, keys.p256dh, or keys.auth'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if subscription already exists
    const { data: existing } = await supabaseClient
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()

    const expirationTime = subscription.expirationTime 
      ? new Date(subscription.expirationTime).toISOString()
      : null

    if (existing) {
      // Update existing subscription
      const { error } = await supabaseClient
        .from('push_subscriptions')
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expiration_time: expirationTime,
          subscription: subscription,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating subscription:', error)
        throw error
      }

      console.log('Subscription updated successfully for user:', user.id)
      return new Response(
        JSON.stringify({ success: true, action: 'updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Insert new subscription
      const { error } = await supabaseClient
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expiration_time: expirationTime,
          subscription: subscription
        })

      if (error) {
        console.error('Error inserting subscription:', error)
        throw error
      }

      console.log('Subscription created successfully for user:', user.id)
      return new Response(
        JSON.stringify({ success: true, action: 'created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('Error in save-push-subscription function:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
