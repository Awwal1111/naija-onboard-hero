import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  initOneSignal,
  setOneSignalExternalUserId,
  removeOneSignalExternalUserId,
  requestOneSignalPermission,
  isOneSignalPushEnabled,
  OneSignal,
} from '@/lib/onesignal'
import { detectMiniPaySync } from '@/lib/minipay'

const isMiniPayEnv = detectMiniPaySync().isMiniPay

export const useOneSignalPush = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  // Initialize OneSignal and link user
  useEffect(() => {
    if (isMiniPayEnv) return

    const setup = async () => {
      await initOneSignal()
      setPushEnabled(isOneSignalPushEnabled())

      if (user) {
        await setOneSignalExternalUserId(user.id)
      }
    }

    setup()

    return () => {
      if (!user) {
        removeOneSignalExternalUserId()
      }
    }
  }, [user])

  // Listen for permission changes
  useEffect(() => {
    if (isMiniPayEnv) return

    const handlePermissionChange = (permission: boolean) => {
      console.log('[OneSignal] Permission changed:', permission)
      setPushEnabled(permission)
    }

    try {
      OneSignal.Notifications.addEventListener('permissionChange', handlePermissionChange)
      return () => {
        OneSignal.Notifications.removeEventListener('permissionChange', handlePermissionChange)
      }
    } catch {
      // OneSignal not initialized yet
    }
  }, [])

  const requestPushPermission = useCallback(async () => {
    if (isMiniPayEnv) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not available in MiniPay',
        variant: 'destructive',
      })
      return false
    }

    setLoading(true)
    try {
      const granted = await requestOneSignalPermission()
      setPushEnabled(granted)

      if (granted) {
        toast({
          title: 'Success! 🔔',
          description: 'Push notifications enabled. You\'ll receive alerts even when the app is closed.',
        })
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser/phone settings',
          variant: 'destructive',
        })
      }

      return granted
    } catch (error: any) {
      console.error('[OneSignal] Request permission error:', error)
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [toast])

  const disablePushNotifications = useCallback(async () => {
    try {
      // OneSignal doesn't have a direct "disable" — we opt out
      await OneSignal.User.PushSubscription.optOut()
      setPushEnabled(false)
      toast({
        title: 'Disabled',
        description: 'Push notifications have been disabled',
      })
    } catch (error) {
      console.error('[OneSignal] Disable error:', error)
      toast({
        title: 'Error',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      })
    }
  }, [toast])

  return {
    pushEnabled,
    loading,
    requestPushPermission,
    disablePushNotifications,
  }
}
