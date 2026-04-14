import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata?: any
  read_at?: string
  created_at: string
}

export const useNotifications = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      subscribeToNotifications()
      checkPushPermission()
    }
  }, [user])

  const checkPushPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Push notifications not supported - no Notification API')
      return
    }
    if (!('serviceWorker' in navigator)) {
      console.log('Push notifications not supported - no Service Worker API')
      return
    }
    // iOS Safari < 16.4 doesn't support push
    if (!('PushManager' in window)) {
      console.log('Push notifications not supported - no PushManager API')
      return
    }

    const permission = Notification.permission
    setPushEnabled(permission === 'granted')

    if (permission === 'granted') {
      try {
        const registration = await getServiceWorkerRegistration()
        if (!registration) return
        const subscription = await registration.pushManager.getSubscription()
        setPushSubscription(subscription)
      } catch (error) {
        console.error('Error checking push subscription:', error)
      }
    }
  }

  // Helper: get SW registration with timeout (don't hang forever)
  const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null
    
    try {
      // Race between SW ready and a 5-second timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ])
      
      if (!registration) {
        console.warn('[Push] Service worker not ready after 5s - trying getRegistrations fallback')
        const registrations = await navigator.serviceWorker.getRegistrations()
        return registrations[0] || null
      }
      
      return registration
    } catch (err) {
      console.error('[Push] Error getting SW registration:', err)
      return null
    }
  }

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported on this device/browser',
        variant: 'destructive',
      })
      return false
    }
    if (!('PushManager' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications require a modern browser. Please update your browser or use Chrome/Edge.',
        variant: 'destructive',
      })
      return false
    }

    try {
      console.log('[Push] Starting push notification setup...')
      
      // Get SW registration with timeout
      const registration = await getServiceWorkerRegistration()
      if (!registration) {
        // Try to register SW on the fly
        console.log('[Push] No SW found, attempting registration...')
        try {
          const freshReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          await freshReg.update()
          // Wait briefly for activation
          await new Promise(resolve => setTimeout(resolve, 1000))
          return await setupPushSubscription(freshReg)
        } catch (regErr) {
          console.error('[Push] SW registration failed:', regErr)
          toast({
            title: 'Setup Failed',
            description: 'Could not initialize push notifications. Please try installing the app first.',
            variant: 'destructive',
          })
          return false
        }
      }
      
      console.log('[Push] Service Worker ready:', registration.scope)
      return await setupPushSubscription(registration)
    } catch (error: any) {
      console.error('[Push] Error requesting push permission:', error)
      toast({
        title: 'Error',
        description: `Failed to enable push notifications: ${error.message}`,
        variant: 'destructive',
      })
      return false
    }
  }

  const setupPushSubscription = async (registration: ServiceWorkerRegistration): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission()
      console.log('[Push] Permission result:', permission)
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser/phone settings',
          variant: 'destructive',
        })
        return false
      }

      // Unsubscribe existing
      let subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        console.log('[Push] Unsubscribing existing subscription...')
        await subscription.unsubscribe()
      }
      
      // Subscribe with VAPID key
      console.log('[Push] Creating new subscription...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BLpOlYmZrInf0zI1oSxqhGvAhSm3HEqVALjIvZtgoCXU-N59AX0SbjhLL3RF5aX-eG4A31uBFM2gkGYpVEtQdbw'
        ),
      })
        
        console.log('Push subscription created:', subscription)
        setPushSubscription(subscription)
        
        // Save subscription to backend
        console.log('Saving subscription to backend...')
        await savePushSubscription(subscription)
        
        setPushEnabled(true)
        
        toast({
          title: 'Success',
          description: 'Push notifications enabled successfully! You can now test them.',
        })
        
        return true
      } else {
        console.log('Permission denied by user')
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        })
        return false
      }
    } catch (error: any) {
      console.error('Error requesting push permission:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message
      })
      
      toast({
        title: 'Error',
        description: `Failed to enable push notifications: ${error.message}`,
        variant: 'destructive',
      })
      return false
    }
  }

  const savePushSubscription = async (subscription: PushSubscription) => {
    if (!user) return

    try {
      console.log('Saving push subscription for user:', user.id)
      console.log('Subscription details:', {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        hasKeys: !!subscription.toJSON().keys
      })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { data, error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          subscription: subscription.toJSON()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) {
        console.error('Error response from save-push-subscription:', error)
        throw new Error(error.message || 'Failed to save subscription')
      }

      console.log('Push subscription saved successfully:', data)
    } catch (error: any) {
      console.error('Error saving push subscription:', {
        message: error.message,
        details: error,
      })
      throw error
    }
  }

  const disablePushNotifications = async () => {
    if (!pushSubscription) return

    try {
      await pushSubscription.unsubscribe()
      setPushSubscription(null)
      setPushEnabled(false)
      
      // Remove subscription from backend
      if (user) {
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
      }
      
      toast({
        title: 'Disabled',
        description: 'Push notifications have been disabled',
      })
    } catch (error) {
      console.error('Error disabling push notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      })
    }
  }

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read_at).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any,
    sendEmail: boolean = false
  ) => {
    try {
      // For transaction and important notifications, send via edge function with email and push
      if (sendEmail || type === 'transaction' || type === 'withdrawal' || type === 'deposit' || type === 'payment') {
        const { error } = await supabase.functions.invoke('send-notification', {
          body: {
            userId,
            type,
            title,
            message,
            metadata,
            sendEmail: true,
            emailTemplate: type.includes('transaction') || type.includes('payment') || type.includes('withdrawal') || type.includes('deposit') ? 'transaction' : 'general',
            attachPDF: type === 'transaction' || type === 'payment'
          }
        })

        if (error) {
          console.error('Error sending notification with email:', error)
          // Fallback to database insert
          await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            metadata
          })
        }
        
        // Also send push notification for important types only
        supabase.functions.invoke('send-push-notification', {
          body: {
            userId,
            title,
            body: message,
            data: { type, ...metadata }
          }
        }).catch(e => console.warn('Push notification failed:', e))
      } else {
        // Regular notification — just insert to DB, no edge function call
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title,
            message,
            metadata
          })

        if (error) throw error
        // Skip push for regular notifications to reduce edge function load
      }
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
    pushEnabled,
    requestPushPermission,
    disablePushNotifications,
  }
}