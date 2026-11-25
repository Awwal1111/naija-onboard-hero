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

  // Initialize once, then link (or unlink) the currently authenticated user.
  useEffect(() => {
    if (isMiniPayEnv) return

    let active = true
    const syncStatus = () => {
      if (active) setPushEnabled(isOneSignalPushEnabled())
    }

    const setup = async () => {
      const ready = await initOneSignal()
      if (!ready || !active) {
        syncStatus()
        return
      }

      if (user?.id) {
        await setOneSignalExternalUserId(user.id)
      } else {
        await removeOneSignalExternalUserId()
      }

      syncStatus()

      // Keep the UI tied to the actual OneSignal subscription, not just the
      // browser's notification permission.
      OneSignal.User.PushSubscription.addEventListener('change', syncStatus)
      OneSignal.Notifications.addEventListener('permissionChange', syncStatus)
    }

    void setup()

    return () => {
      active = false
      if (typeof OneSignal !== 'undefined') {
        try {
          OneSignal.User.PushSubscription.removeEventListener('change', syncStatus)
          OneSignal.Notifications.removeEventListener('permissionChange', syncStatus)
        } catch {
          // SDK may not have initialized yet.
        }
      }
    }
  }, [user?.id])

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
      setPushEnabled(isOneSignalPushEnabled())

      if (granted) {
        toast({
          title: 'Push notifications enabled',
          description: 'This device is subscribed through OneSignal.',
        })
      } else {
        toast({
          title: 'Setup not completed',
          description: 'Browser permission was not enough to confirm a OneSignal subscription. Please try again in your browser.',
          variant: 'destructive',
        })
      }

      return granted
    } catch (error) {
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
    setLoading(true)
    try {
      if (!(await initOneSignal())) throw new Error('OneSignal is not initialized')
      await OneSignal.User.PushSubscription.optOut()
      setPushEnabled(false)
      toast({
        title: 'Disabled',
        description: 'Push notifications have been disabled on this device',
      })
    } catch (error) {
      console.error('[OneSignal] Disable error:', error)
      toast({
        title: 'Error',
        description: 'Failed to disable push notifications',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  return {
    pushEnabled,
    loading,
    requestPushPermission,
    disablePushNotifications,
  }
}
