import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

interface NotificationParams {
  userId: string
  type: string
  title: string
  message: string
  amount?: number
  metadata?: any
}

export async function sendAllNotifications(
  supabase: any,
  params: NotificationParams
): Promise<void> {
  const { userId, type, title, message, amount, metadata } = params

  console.log(`[NOTIFICATION] Sending all notifications for user ${userId}:`, { type, title, amount })

  try {
    // 1. Create in-app notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: metadata || {}
      })

    if (notifError) {
      console.error('[NOTIFICATION] In-app notification error:', notifError)
    } else {
      console.log('[NOTIFICATION] ✅ In-app notification created')
    }

    // 2. Send email notification
    try {
      const { error: emailError } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type,
          title,
          message,
          amount,
          metadata
        }
      })

      if (emailError) {
        console.error('[NOTIFICATION] Email notification error:', emailError)
      } else {
        console.log('[NOTIFICATION] ✅ Email notification sent')
      }
    } catch (emailErr) {
      console.error('[NOTIFICATION] Email notification failed:', emailErr)
    }

    // 3. Send Telegram notification
    try {
      const { error: telegramError } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          userId,
          message: `${title}\n\n${message}`,
          metadata
        }
      })

      if (telegramError) {
        console.error('[NOTIFICATION] Telegram notification error:', telegramError)
      } else {
        console.log('[NOTIFICATION] ✅ Telegram notification sent')
      }
    } catch (telegramErr) {
      console.error('[NOTIFICATION] Telegram notification failed:', telegramErr)
    }

    console.log('[NOTIFICATION] 🎉 All notifications processed')
  } catch (error) {
    console.error('[NOTIFICATION] Error in sendAllNotifications:', error)
  }
}
