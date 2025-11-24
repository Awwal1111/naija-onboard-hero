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
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported')
      return
    }

    const permission = Notification.permission
    setPushEnabled(permission === 'granted')

    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setPushSubscription(subscription)
      } catch (error) {
        console.error('Error checking push subscription:', error)
      }
    }
  }

  const requestPushPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported on this device',
        variant: 'destructive',
      })
      return false
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registered:', registration)

      // Request notification permission
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        setPushEnabled(true)
        
        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // VAPID public key - you'll need to generate this
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib37gp65ImqH8IaG_d5zGW3TpUY0Dh3TGX2hP_mMLpYXLvJ4WdE_kCDZiQ8'
          ),
        })
        
        setPushSubscription(subscription)
        
        // Save subscription to backend
        await savePushSubscription(subscription)
        
        toast({
          title: 'Success',
          description: 'Push notifications enabled successfully',
        })
        
        return true
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        })
        return false
      }
    } catch (error) {
      console.error('Error requesting push permission:', error)
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      })
      return false
    }
  }

  const savePushSubscription = async (subscription: PushSubscription) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          subscription: subscription.toJSON()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) throw error
      console.log('Push subscription saved successfully')
    } catch (error) {
      console.error('Error saving push subscription:', error)
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
      // For transaction and important notifications, send via edge function with email
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
      } else {
        // Regular notification without email
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