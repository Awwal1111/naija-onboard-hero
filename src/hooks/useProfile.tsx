import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  bio: string | null
  profession: string | null
  profile_picture_url: string | null
  phone_number: string | null
  connections_count: number
  wallet_balance: number
  balance_withdrawable?: number
  balance_non_withdrawable?: number
  state_id: string | null
  state_name: string | null
  lga_name: string | null
  area: string | null
  country?: string | null
  country_code?: string | null
  is_expert: boolean
  expert_verified_at: string | null
  referral_code: string | null
  telegram_user_id: string | null
  telegram_username: string | null
  celo_wallet_address?: string | null
  average_rating?: number
  rating_count?: number
  // Verification fields
  verification_level?: string | null
  email_verified?: boolean
  phone_verified?: boolean
  face_verified?: boolean
  identity_verified?: boolean
  verification_country?: string | null
  risk_score?: number
  avg_response_time_seconds?: number | null
  // Premium subscription fields
  is_premium?: boolean
  premium_expires_at?: string | null
  premium_subscribed_at?: string | null
  whatsapp_number?: string | null
  facebook_url?: string | null
  username?: string | null
  business_name?: string | null
  google_meet_link?: string | null
  sms_job_alerts?: boolean
  account_type?: string | null
  user_mode?: string | null
  onboarding_completed?: boolean | null
  email_2fa_enabled?: boolean
  transaction_pin?: string | null
  encrypted_wallet?: string | null
  created_at: string
  updated_at: string
}

export interface ExpertRating {
  id: string
  expert_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface SocialTask {
  id: number
  task_giver_id: string
  platform: string
  type: string
  link: string
  reward: number
  total_slots: number
  done_slots: number
  status: 'open' | 'active' | 'completed' | 'paused'
  created_at: string
}

// In-memory session cache to avoid repeated /profiles fetches across components/pages
const profileCache = new Map<string, { data: Profile; ts: number }>()
// Share an in-flight request between components mounting at the same time.
const profileRequests = new Map<string, Promise<Profile | null>>()
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const PROFILE_SELECT = 'id, user_id, full_name, profession, bio, profile_picture_url, phone_number, country_code, state_name, state_id, lga_name, area, is_expert, expert_verified_at, wallet_balance, balance_withdrawable, balance_non_withdrawable, connections_count, average_rating, rating_count, referral_code, email_verified, phone_verified, face_verified, created_at, updated_at, premium_expires_at, avg_response_time_seconds, account_type, user_mode, onboarding_completed, is_premium, verification_level, telegram_user_id, telegram_username, whatsapp_number, facebook_url, google_meet_link, sms_job_alerts, username, business_name'

export const useProfile = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(() => {
    return user ? (profileCache.get(user.id)?.data ?? null) : null
  })
  const [loading, setLoading] = useState(!profile)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const cached = profileCache.get(user.id)
    if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
      setProfile(cached.data)
      setLoading(false)
      return
    }

    // Never display the previous account's profile while a new account loads.
    setProfile(null)
    setLoading(true)
    void fetchProfile()
  }, [user?.id])

  const fetchProfile = async (force = false) => {
    if (!user) return

    if (!force) {
      const cached = profileCache.get(user.id)
      if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
        setProfile(cached.data)
        setLoading(false)
        return
      }
    }

    let request = profileRequests.get(user.id)
    if (!request) {
      request = (async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        if (data) return data as Profile

        // Create only after a successful lookup confirms the row is absent.
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([{
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            phone_number: user.user_metadata?.phone_number || '',
          }])
          .select(PROFILE_SELECT)
          .single()

        if (createError) {
          // Another component/session may have created it after our lookup.
          if (createError.code === '23505') {
            const { data: existing, error: retryError } = await supabase
              .from('profiles')
              .select(PROFILE_SELECT)
              .eq('user_id', user.id)
              .maybeSingle()
            if (retryError) throw retryError
            return (existing as Profile | null) ?? null
          }
          throw createError
        }
        return created as Profile
      })()
      profileRequests.set(user.id, request)
    }

    try {
      const data = await request
      if (data) {
        profileCache.set(user.id, { data, ts: Date.now() })
        setProfile(data)
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      if (profileRequests.get(user.id) === request) profileRequests.delete(user.id)
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' }

    try {
      setLoading(true)
      
      // First check if profile exists
      const { data: existingProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      // Do not treat a failed lookup as a missing profile: inserting in that case
      // can fail with a duplicate-user constraint and hide the real database error.
      if (lookupError) throw lookupError

      let result
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single()
      } else {
        // Insert new profile if it doesn't exist
        result = await supabase
          .from('profiles')
          .insert([{ user_id: user.id, ...updates }])
          .select()
          .single()
      }

      const { data, error } = result
      if (error) throw error

      profileCache.set(user.id, { data: data as Profile, ts: Date.now() })
      setProfile(data as Profile)
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    updateProfile,
    refetch: () => fetchProfile(true)
  }
}
