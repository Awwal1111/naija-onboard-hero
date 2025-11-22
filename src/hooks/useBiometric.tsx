import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export const useBiometric = () => {
  const { user } = useAuth()
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkBiometricAvailability()
    if (user) {
      loadBiometricStatus()
    }
  }, [user])

  const checkBiometricAvailability = async () => {
    // Check if Web Authentication API is available
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        setIsAvailable(available)
      } catch (error) {
        console.error('Error checking biometric availability:', error)
        setIsAvailable(false)
      }
    } else {
      setIsAvailable(false)
    }
    setLoading(false)
  }

  const loadBiometricStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('biometric_enabled')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setIsEnabled(data?.biometric_enabled || false)
    } catch (error) {
      console.error('Error loading biometric status:', error)
    }
  }

  const enableBiometric = async () => {
    if (!user || !isAvailable) {
      toast.error('Biometric authentication is not available on this device')
      return false
    }

    try {
      // Create credential for biometric authentication
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'NaijaLancers',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || '',
            displayName: user.email || ''
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      })

      if (!credential) {
        throw new Error('Failed to create credential')
      }

      // Store biometric enabled status
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: true })
        .eq('user_id', user.id)

      if (error) throw error

      setIsEnabled(true)
      toast.success('Biometric authentication enabled')
      return true
    } catch (error: any) {
      console.error('Error enabling biometric:', error)
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or denied')
      } else {
        toast.error('Failed to enable biometric authentication')
      }
      return false
    }
  }

  const disableBiometric = async () => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: false })
        .eq('user_id', user.id)

      if (error) throw error

      setIsEnabled(false)
      toast.success('Biometric authentication disabled')
      return true
    } catch (error) {
      console.error('Error disabling biometric:', error)
      toast.error('Failed to disable biometric authentication')
      return false
    }
  }

  const authenticate = async (): Promise<boolean> => {
    if (!user || !isEnabled || !isAvailable) {
      return false
    }

    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
        }
      })

      if (!credential) {
        throw new Error('Authentication failed')
      }

      return true
    } catch (error: any) {
      console.error('Biometric authentication error:', error)
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled')
      } else {
        toast.error('Biometric authentication failed')
      }
      return false
    }
  }

  return {
    isAvailable,
    isEnabled,
    loading,
    enableBiometric,
    disableBiometric,
    authenticate
  }
}
