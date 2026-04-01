import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load - NO async
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

/**
 * OPTIMIZED: Reduced from 18 channels to 3 user-filtered channels.
 * Only listens for HIGH-PRIORITY events that directly target the current user.
 * 
 * Social notifications (likes, comments, new jobs, courses, etc.) are handled
 * by in-app notification inserts — NOT realtime push triggers.
 * 
 * This dramatically reduces:
 * - Realtime connections (was 18/user → now 3/user)
 * - Edge function invocations (send-push-notification)
 * - Cascade DB queries from unfiltered channel callbacks
 * - Egress bandwidth
 */
export const usePushNotificationTriggers = () => {
  // CRITICAL: Skip ALL subscriptions in MiniPay to prevent flickering
  if (isMiniPayEnv) {
    return;
  }

  return usePushNotificationTriggersInternal();
};

// Internal hook - only runs in non-MiniPay environments
const usePushNotificationTriggersInternal = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    console.log('[Push] Setting up lightweight notification triggers for user:', user.id)

    // Helper to send push notification
    const sendPush = async (payload: {
      userId: string
      title: string
      body: string
      icon?: string
      url?: string
      data?: any
    }) => {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            ...payload,
            icon: payload.icon || '/icon-512.png',
            badge: '/icon-512.png'
          }
        })
      } catch (error) {
        console.error('[Push] Failed to send:', error)
      }
    }

    // CHANNEL 1: Wallet transactions (user-filtered, high priority)
    const walletChannel = supabase
      .channel('wallet-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const tx = payload.new as any
          const isCredit = tx.amount > 0
          const kindMap: Record<string, string> = {
            deposit: '💰 Deposit Successful',
            withdrawal: '💸 Withdrawal Processed',
            transfer: isCredit ? '📥 Transfer Received' : '📤 Transfer Sent',
            safepay: '🔒 SafePay Transaction',
            refund: '↩️ Refund Received',
          }
          await sendPush({
            userId: user.id,
            title: kindMap[tx.kind] || (isCredit ? 'Money Received' : 'Money Sent'),
            body: `NC ${Math.abs(tx.amount).toLocaleString()} ${isCredit ? 'credited to' : 'debited from'} your wallet`,
            url: '/settings',
            data: { type: 'wallet_transaction', transactionId: tx.id }
          })
        }
      )
      .subscribe()

    // CHANNEL 2: Direct messages to this user (user-filtered via notifications table)
    const notificationsChannel = supabase
      .channel('notifications-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const notif = payload.new as any
          // Only push for message-type notifications
          if (notif.type === 'message') {
            await sendPush({
              userId: user.id,
              title: notif.title || 'New Message',
              body: notif.message?.substring(0, 100) || 'You have a new message',
              url: notif.link || '/chat',
              data: { type: 'message' }
            })
          }
        }
      )
      .subscribe()

    // CHANNEL 3: Expert application status changes (user-filtered)
    const expertAppChannel = supabase
      .channel('expert-app-push')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expert_applications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const app = payload.new as any
          const old = payload.old as any
          if (old.status === app.status) return

          if (app.status === 'approved') {
            await sendPush({
              userId: user.id,
              title: '🎉 Expert Application Approved!',
              body: 'Congratulations! You are now a verified expert.',
              url: '/expert-application',
            })
          } else if (app.status === 'rejected') {
            await sendPush({
              userId: user.id,
              title: 'Expert Application Update',
              body: app.admin_feedback || 'Your application was not approved.',
              url: '/expert-application',
            })
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Push] Cleaning up notification triggers')
      supabase.removeChannel(walletChannel)
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(expertAppChannel)
    }
  }, [user])
}
