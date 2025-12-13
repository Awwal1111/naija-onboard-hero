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

  console.log(`[NOTIFICATION] ========================================`)
  console.log(`[NOTIFICATION] Sending all notifications for user ${userId}`)
  console.log(`[NOTIFICATION] Type: ${type}, Title: ${title}, Amount: ${amount}`)

  try {
    // 1. Create in-app notification
    console.log('[NOTIFICATION] 1️⃣ Creating in-app notification...')
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
      console.error('[NOTIFICATION] ❌ In-app notification error:', notifError)
    } else {
      console.log('[NOTIFICATION] ✅ In-app notification created')
    }

    // 2. Send push notification to browser
    console.log('[NOTIFICATION] 2️⃣ Sending push notification...')
    try {
      const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title,
          body: message,
          icon: '/icon-512.png',
          badge: '/icon-512.png',
          data: metadata,
          url: metadata?.actionUrl || '/dashboard'
        }
      })

      if (pushError) {
        console.error('[NOTIFICATION] ❌ Push notification error:', pushError)
      } else {
        console.log('[NOTIFICATION] ✅ Push notification result:', pushData)
      }
    } catch (pushErr) {
      console.error('[NOTIFICATION] ❌ Push notification failed:', pushErr)
    }

    // 3. Send Telegram notification (use user_id, not userId)
    console.log('[NOTIFICATION] 3️⃣ Sending Telegram notification...')
    try {
      const telegramMessage = `🔔 *${title}*\n\n${message}`
      
      const { data: telegramData, error: telegramError } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          user_id: userId, // FIXED: use user_id, not userId
          message: telegramMessage,
          parse_mode: 'Markdown'
        }
      })

      if (telegramError) {
        console.error('[NOTIFICATION] ❌ Telegram notification error:', telegramError)
      } else {
        console.log('[NOTIFICATION] ✅ Telegram notification result:', telegramData)
      }
    } catch (telegramErr) {
      console.error('[NOTIFICATION] ❌ Telegram notification failed:', telegramErr)
    }

    // 4. Send email notification with PDF receipt for financial transactions
    const isFinancialTransaction = type.includes('transaction') || 
      type.includes('payment') || 
      type.includes('withdrawal') || 
      type.includes('deposit') || 
      type === 'deposit_completed' || 
      type === 'withdrawal_completed'
    
    console.log('[NOTIFICATION] 4️⃣ Sending email notification... (financial:', isFinancialTransaction, ')')
    try {
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type,
          title,
          message,
          metadata: {
            ...metadata,
            transactionType: metadata?.transactionType || type,
            amount: amount ? `₦${amount.toLocaleString()} NC` : metadata?.amount,
            reference: metadata?.reference || `TXN-${Date.now()}`,
            status: 'Completed'
          },
          sendEmail: true,
          emailTemplate: isFinancialTransaction ? 'transaction' : 'general',
          attachPDF: isFinancialTransaction
        }
      })

      if (emailError) {
        console.error('[NOTIFICATION] ❌ Email notification error:', emailError)
      } else {
        console.log('[NOTIFICATION] ✅ Email notification result:', emailData)
      }
    } catch (emailErr) {
      console.error('[NOTIFICATION] ❌ Email notification failed:', emailErr)
    }

    console.log('[NOTIFICATION] 🎉 All notifications processed')
    console.log(`[NOTIFICATION] ========================================`)
  } catch (error) {
    console.error('[NOTIFICATION] ❌ Error in sendAllNotifications:', error)
  }
}
