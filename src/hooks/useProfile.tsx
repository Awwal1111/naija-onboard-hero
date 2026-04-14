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
  google_meet_link?: string | null
  sms_job_alerts?: boolean
  account_type?: string | null
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

export const useProfile = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, profession, bio, profile_picture_url, phone_number, state_name, lga_name, area, is_expert, expert_verified_at, wallet_balance, balance_withdrawable, balance_non_withdrawable, connections_count, average_rating, rating_count, referral_code, email_confirmed, email_verified, phone_verified, face_verified, created_at, updated_at, is_boosted, boost_expires_at, premium_expires_at, transaction_pin, avg_response_time_seconds, account_type, onboarding_completed, user_mode, open_to_work, is_premium, verification_level')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          await createProfile()
        } else {
          throw error
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            phone_number: user.user_metadata?.phone_number || '',
          }
        ])
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error creating profile:', error)
      toast({
        title: "Error",
        description: "Failed to create profile",
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' }

    try {
      setLoading(true)
      
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

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

      setProfile(data)
      
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
    refetch: fetchProfile
  }
}
