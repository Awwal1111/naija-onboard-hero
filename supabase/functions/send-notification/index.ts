import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { userId, type, title, message, metadata } = await req.json() as NotificationRequest

    console.log('Creating notification:', { userId, type, title })

    // Insert notification
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
