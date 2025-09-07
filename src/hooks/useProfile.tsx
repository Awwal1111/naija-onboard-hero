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
  state_id: string | null
  state_name: string | null
  lga_name: string | null
  area: string | null
  is_expert: boolean
  expert_verified_at: string | null
  referral_code: string | null
  average_rating?: number
  rating_count?: number
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
        .select('*')
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
    if (!user) return { success: false, error: 'User not authenticated' }

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