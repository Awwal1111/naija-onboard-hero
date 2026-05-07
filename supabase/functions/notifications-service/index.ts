import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'
import { Resend } from 'npm:resend@4.0.0'
import * as React from 'npm:react@18.3.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const HTTPSMS_API_KEY = Deno.env.get('HTTPSMS_API_KEY')
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface NotificationRequest {
  userId?: string
  type: string
  title: string
  message: string
  metadata?: any
  channels?: Array<'in-app' | 'email' | 'sms' | 'push' | 'telegram' | 'webhook'>
  phoneNumber?: string
  webhookUrl?: string
  emailTemplate?: string
  priority?: 'low' | 'normal' | 'high'
}

// Save notification to in-app notifications table
async function saveInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[NOTIFICATION] Error saving in-app notification:', error)
    throw error
  }

  console.log('[NOTIFICATION] In-app notification saved:', data.id)
  return data
}

// Send email notification
async function sendEmailNotification(
  userId: string,
  title: string,
  message: string,
  template?: string
) {
  if (!RESEND_API_KEY) {
    console.warn('[EMAIL] RESEND_API_KEY not configured, skipping email')
    return null
  }

  try {
    const resend = new Resend(RESEND_API_KEY)

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const userEmail = authUser?.user?.email

    if (!userEmail) {
      console.warn('[EMAIL] No email found for user:', userId)
      return null
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single()

    const userName = profile?.full_name || 'User'

    // Simple HTML email (can be expanded with templates)
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">${title}</h2>
          <p style="color: #666; margin: 0 0 20px 0;">${message}</p>
          <p style="color: #999; font-size: 12px; margin: 0;">
            Sent to ${userName} at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `

    const result = await resend.emails.send({
      from: 'notifications@naijalancers.name.ng',
      to: userEmail,
      subject: title,
      html,
    })

    console.log('[EMAIL] Email sent successfully:', result)
    return result
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error)
    throw error
  }
}

// Send SMS notification
async function sendSmsNotification(
  userId: string,
  message: string,
  phoneNumber?: string
) {
  if (!HTTPSMS_API_KEY) {
    console.warn('[SMS] HTTPSMS_API_KEY not configured, skipping SMS')
    return null
  }

  try {
    let recipientPhone = phoneNumber

    // If no phone provided, lookup user's phone
    if (!recipientPhone && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('user_id', userId)
        .single()

      recipientPhone = profile?.phone_number
    }

    if (!recipientPhone) {
      console.warn('[SMS] No phone number found for user:', userId)
      return null
    }

    // Clean and format phone number
    const cleanPhone = recipientPhone.replace(/\s+/g, '').replace(/-/g, '')
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`

    const response = await fetch('https://api.httpsms.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HTTPSMS_API_KEY}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('[SMS] SMS sent successfully:', result)
    return result
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error)
    throw error
  }
}

// Send push notification
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  icon?: string,
  url?: string
) {
  if (!VAPID_PRIVATE_KEY) {
    console.warn('[PUSH] VAPID_PRIVATE_KEY not configured, skipping push')
    return null
  }

  try {
    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.warn('[PUSH] No push subscriptions found for user:', userId)
      return null
    }

    console.log('[PUSH] Found', subscriptions.length, 'subscription(s)')

    const webpush = await import('npm:web-push@3.6.7')

    const vapidPublicKey =
      Deno.env.get('VAPID_PUBLIC_KEY') ||
      'BLpOlYmZrInf0zI1oSxqhGvAhSm3HEqVALjIvZtgoCXU-N59AX0SbjhLL3RF5aX-eG4A31uBFM2gkGYpVEtQdbw'

    webpush.setVapidDetails(
      'mailto:admin@naijalancers.name.ng',
      vapidPublicKey,
      VAPID_PRIVATE_KEY
    )

    const notificationPayload = {
      title,
      body,
      icon: icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `notification-${Date.now()}`,
      requireInteraction: false,
      data: {
        url: url || '/',
      },
    }

    const results = await Promise.all(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(sub.subscription, JSON.stringify(notificationPayload))
          .catch((err: any) => {
            console.error('[PUSH] Error sending to subscription:', err)
            // Delete invalid subscriptions
            if (err.statusCode === 410) {
              supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id)
                .catch((e: any) => console.error('[PUSH] Error deleting subscription:', e))
            }
            return null
          })
      )
    )

    console.log('[PUSH] Push notifications sent:', results.length)
    return results
  } catch (error) {
    console.error('[PUSH] Error sending push notification:', error)
    throw error
  }
}

// Send Telegram notification
async function sendTelegramNotification(
  userId: string,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN not configured, skipping Telegram')
    return null
  }

  try {
    // Get user's Telegram ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_user_id, full_name')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile?.telegram_user_id) {
      console.warn('[TELEGRAM] No Telegram account linked for user:', userId)
      return null
    }

    console.log('[TELEGRAM] Sending to Telegram ID:', profile.telegram_user_id)

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: profile.telegram_user_id,
          text: message,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Telegram API error: ${error.description || response.status}`)
    }

    const result = await response.json()
    console.log('[TELEGRAM] Telegram message sent:', result.result.message_id)
    return result
  } catch (error) {
    console.error('[TELEGRAM] Error sending Telegram notification:', error)
    throw error
  }
}

// Send webhook notification
async function sendWebhookNotification(
  webhookUrl: string,
  payload: any
) {
  if (!webhookUrl) {
    console.warn('[WEBHOOK] No webhook URL provided')
    return null
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`)
    }

    console.log('[WEBHOOK] Webhook sent successfully')
    return await response.json()
  } catch (error) {
    console.error('[WEBHOOK] Error sending webhook:', error)
    throw error
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      userId,
      type,
      title,
      message,
      metadata,
      channels = ['in-app'],
      phoneNumber,
      webhookUrl,
      emailTemplate,
      priority = 'normal',
    } = (await req.json()) as NotificationRequest

    if (!userId || !type || !title || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: userId, type, title, message',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[NOTIFICATIONS] ========================================')
    console.log('[NOTIFICATIONS] Sending notification via channels:', channels)
    console.log('[NOTIFICATIONS] User ID:', userId)
    console.log('[NOTIFICATIONS] Type:', type)
    console.log('[NOTIFICATIONS] Priority:', priority)

    const results: Record<string, any> = {}
    const errors: Record<string, string> = {}

    // Send via each requested channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in-app':
            results['in-app'] = await saveInAppNotification(
              userId,
              type,
              title,
              message,
              metadata
            )
            break

          case 'email':
            results['email'] = await sendEmailNotification(userId, title, message, emailTemplate)
            break

          case 'sms':
            results['sms'] = await sendSmsNotification(userId, message, phoneNumber)
            break

          case 'push':
            results['push'] = await sendPushNotification(userId, title, message)
            break

          case 'telegram':
            results['telegram'] = await sendTelegramNotification(userId, message)
            break

          case 'webhook':
            results['webhook'] = await sendWebhookNotification(webhookUrl, {
              userId,
              type,
              title,
              message,
              metadata,
            })
            break

          default:
            console.warn('[NOTIFICATIONS] Unknown channel:', channel)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors[channel] = errorMsg
        console.error(`[NOTIFICATIONS] Error on ${channel}:`, errorMsg)

        // Only throw critical errors
        if (channel === 'in-app') {
          throw error
        }
      }
    }

    const success = Object.keys(errors).length === 0
    return new Response(
      JSON.stringify({
        success,
        results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      }),
      {
        status: success ? 200 : 207, // 207 = Multi-Status (some channels failed)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[NOTIFICATIONS] Fatal error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
