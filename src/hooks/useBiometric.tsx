import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

type MedianAuthResult = {
  hasTouchId?: boolean
  hasSecret?: boolean
  success?: boolean
  secret?: string
  error?: string
}

type MedianBridge = {
  isNativeApp?: () => boolean
  auth?: {
    status: (options?: Record<string, unknown>) => Promise<MedianAuthResult>
    save: (options: Record<string, unknown>) => Promise<MedianAuthResult>
    get: (options?: Record<string, unknown>) => Promise<MedianAuthResult>
    delete: (options?: Record<string, unknown>) => Promise<MedianAuthResult>
  }
}

declare global {
  interface Window {
    Median?: MedianBridge
  }
}

const DEVICE_AUTH_SECRET = 'naijalancers-biometric-unlock-v1'

const waitForMedianBridge = async (): Promise<MedianBridge | null> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 3000) {
    const bridge = window.Median
    if (bridge?.isNativeApp?.() && bridge.auth) return bridge
    await new Promise(resolve => window.setTimeout(resolve, 150))
  }
  return null
}

export const useBiometric = () => {
  const { user } = useAuth()
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadBiometricStatus = useCallback(async () => {
    if (!user) {
      setIsAvailable(false)
      setIsEnabled(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const bridge = await waitForMedianBridge()
      if (!bridge?.auth) {
        setIsAvailable(false)
        setIsEnabled(false)
        return
      }

      const status = await bridge.auth.status({ minimumAndroidBiometric: 'strong' })
      const available = status?.hasTouchId === true
      setIsAvailable(available)

      const { data, error } = await supabase
        .from('profiles')
        .select('biometric_enabled')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setIsEnabled(available && data?.biometric_enabled === true && status?.hasSecret === true)
    } catch (error) {
      console.error('Error loading Median biometric status:', error)
      setIsAvailable(false)
      setIsEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadBiometricStatus()
  }, [loadBiometricStatus])

  const enableBiometric = async () => {
    if (!user) return false

    try {
      const bridge = await waitForMedianBridge()
      if (!bridge?.auth) {
        toast.error('Fingerprint is available in the supported NaijaLancers Android app only. Use your PIN on the website.')
        return false
      }

      const status = await bridge.auth.status({ minimumAndroidBiometric: 'strong' })
      if (status?.hasTouchId !== true) {
        toast.error('No enrolled fingerprint or strong biometric was detected on this device.')
        return false
      }

      const saved = await bridge.auth.save({
        secret: DEVICE_AUTH_SECRET + ':' + user.id,
        minimumAndroidBiometric: 'strong'
      })
      if (saved?.success !== true) throw new Error(saved?.error || 'Could not save device biometric')

      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: true })
        .eq('user_id', user.id)

      if (error) {
        await bridge.auth.delete()
        throw error
      }

      setIsAvailable(true)
      setIsEnabled(true)
      toast.success('Fingerprint authentication enabled on this device')
      return true
    } catch (error) {
      console.error('Error enabling Median biometric:', error)
      toast.error('Could not enable fingerprint authentication. Your PIN still works.')
      return false
    }
  }

  const disableBiometric = async () => {
    if (!user) return false

    try {
      const bridge = await waitForMedianBridge()
      if (bridge?.auth) await bridge.auth.delete()

      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: false })
        .eq('user_id', user.id)

      if (error) throw error
      setIsEnabled(false)
      toast.success('Fingerprint authentication disabled')
      return true
    } catch (error) {
      console.error('Error disabling Median biometric:', error)
      toast.error('Could not disable fingerprint authentication')
      return false
    }
  }

  const authenticate = async (): Promise<boolean> => {
    if (!user || !isEnabled || !isAvailable) return false

    try {
      const bridge = await waitForMedianBridge()
      if (!bridge?.auth) return false

      const result = await bridge.auth.get({
        minimumAndroidBiometric: 'strong',
        prompt: 'Confirm your NaijaLancers transaction',
        callbackOnCancel: 1
      })

      return result?.success === true && result.secret === DEVICE_AUTH_SECRET + ':' + user.id
    } catch (error) {
      console.error('Median biometric authentication failed:', error)
      toast.error('Fingerprint authentication failed. Enter your transaction PIN instead.')
      return false
    }
  }

  return {
    isAvailable,
    isEnabled,
    loading,
    enableBiometric,
    disableBiometric,
    authenticate,
    refreshBiometricStatus: loadBiometricStatus
  }
}
