import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

interface NotificationParams {
  userId: string
  type: string
  title: string
  message: string
  amount?: number
  metadata?: any
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

/**
 * Unified notification sender that uses the smart notification engine
 * to determine the best channels based on user status.
 * 
 * Priority levels:
 * - low: In-app only
 * - normal: Push + Telegram if offline
 * - high: Push + Telegram + Email
 * - urgent: All channels including SMS for inactive users
 */
export async function sendAllNotifications(
  supabase: any,
  params: NotificationParams
): Promise<void> {
  const { userId, type, title, message, amount, metadata, priority = 'normal' } = params

  console.log(`[NOTIFICATION] ========================================`)
  console.log(`[NOTIFICATION] Sending smart notification for user ${userId}`)
  console.log(`[NOTIFICATION] Type: ${type}, Title: ${title}, Priority: ${priority}`)

  try {
    // Use the smart notification engine to handle channel selection
    const { data, error } = await supabase.functions.invoke('smart-notification', {
      body: {
        userId,
        type,
        title,
        message,
        priority,
        data: {
          ...metadata,
          amount: amount ? `₦${amount.toLocaleString()} NC` : undefined,
          transactionType: metadata?.transactionType || type
        },
        actionUrl: metadata?.actionUrl || '/dashboard'
      }
    })

    if (error) {
      console.error('[NOTIFICATION] ❌ Smart notification error:', error)
      
      // Fallback to direct notification creation
      console.log('[NOTIFICATION] Falling back to direct notification...')
      await createDirectNotification(supabase, params)
    } else {
      console.log('[NOTIFICATION] ✅ Smart notification result:', data)
      console.log('[NOTIFICATION] Channels used:', data?.channels?.join(', ') || 'none')
    }

    console.log('[NOTIFICATION] 🎉 Notification processing complete')
    console.log(`[NOTIFICATION] ========================================`)
  } catch (error) {
    console.error('[NOTIFICATION] ❌ Error in sendAllNotifications:', error)
    
    // Final fallback - just create in-app notification
    try {
      await createDirectNotification(supabase, params)
    } catch (fallbackError) {
      console.error('[NOTIFICATION] ❌ Fallback also failed:', fallbackError)
    }
  }
}

/**
 * Direct notification creation without using edge functions
 * Used as fallback when smart-notification fails
 */
async function createDirectNotification(
  supabase: any,
  params: NotificationParams
): Promise<void> {
  const { userId, type, title, message, amount, metadata } = params

  console.log('[NOTIFICATION] Creating direct in-app notification...')
  
  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      metadata: {
        ...metadata,
        amount: amount ? `₦${amount.toLocaleString()} NC` : undefined,
        fallback: true
      }
    })

  if (notifError) {
    console.error('[NOTIFICATION] ❌ Direct notification error:', notifError)
    throw notifError
  } else {
    console.log('[NOTIFICATION] ✅ Direct in-app notification created')
  }
}

/**
 * Send notification for high-value events that should reach users via all channels
 */
export async function sendUrgentNotification(
  supabase: any,
  params: Omit<NotificationParams, 'priority'>
): Promise<void> {
  return sendAllNotifications(supabase, { ...params, priority: 'urgent' })
}

/**
 * Send notification for transaction-related events
 */
export async function sendTransactionNotification(
  supabase: any,
  params: NotificationParams
): Promise<void> {
  // Financial notifications are at least 'high' priority
  const priority = params.priority && ['high', 'urgent'].includes(params.priority) 
    ? params.priority 
    : 'high'
  
  return sendAllNotifications(supabase, { ...params, priority })
}
