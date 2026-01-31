import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface IPCheckResult {
  allowed: boolean
  signup_count: number
  limit: number
  remaining: number
}

export const useIPProtection = () => {
  const [checking, setChecking] = useState(false)

  // Get user's IP address using a free API
  const getClientIP = async (): Promise<string> => {
    try {
      // Use multiple fallback services for reliability
      const services = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
      ]
      
      for (const service of services) {
        try {
          const response = await fetch(service, { 
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3 second timeout
          })
          if (response.ok) {
            const data = await response.json()
            return data.ip || data.query || 'unknown'
          }
        } catch {
          continue // Try next service
        }
      }
      
      return 'unknown'
    } catch (error) {
      console.warn('Could not determine IP address:', error)
      return 'unknown'
    }
  }

  // Check if IP is allowed to signup (rate limited)
  const checkSignupAllowed = async (): Promise<{ allowed: boolean; message?: string }> => {
    setChecking(true)
    try {
      const ip = await getClientIP()
      
      // If we couldn't get IP, allow the signup (don't block legitimate users)
      if (ip === 'unknown') {
        return { allowed: true }
      }

      const { data, error } = await supabase.rpc('check_ip_signup_limit', {
        check_ip: ip
      })

      if (error) {
        console.error('IP check error:', error)
        // On error, allow signup to not block legitimate users
        return { allowed: true }
      }

      const result = data as unknown as IPCheckResult
      
      if (!result.allowed) {
        return {
          allowed: false,
          message: `Too many signups from your network. Please try again later or contact support. (${result.remaining} remaining)`
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('IP protection check failed:', error)
      // On any error, allow signup
      return { allowed: true }
    } finally {
      setChecking(false)
    }
  }

  // Log IP activity after successful signup/login
  const logIPActivity = async (
    userId: string | null,
    actionType: 'signup' | 'login' | 'transaction' = 'signup'
  ): Promise<void> => {
    try {
      const ip = await getClientIP()
      
      if (ip === 'unknown') return

      await supabase.rpc('log_ip_activity', {
        p_ip_address: ip,
        p_user_id: userId,
        p_action_type: actionType,
        p_user_agent: navigator.userAgent
      })
    } catch (error) {
      // Non-critical, don't throw
      console.warn('Failed to log IP activity:', error)
    }
  }

  return {
    checkSignupAllowed,
    logIPActivity,
    checking
  }
}
