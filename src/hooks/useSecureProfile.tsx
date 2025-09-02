import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface PublicProfileInfo {
  id: string
  user_id: string
  full_name: string | null
  profession: string | null
  bio: string | null
  profile_picture_url: string | null
  is_expert: boolean
  expert_verified_at: string | null
  created_at: string
}

export interface ConnectedProfileInfo extends PublicProfileInfo {
  phone_number: string | null
  connections_count: number
  state_name: string | null
  lga_name: string | null
  area: string | null
}

export const useSecureProfile = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Get public profile info (limited data)
  const getPublicProfile = async (userId: string): Promise<PublicProfileInfo | null> => {
    if (!user) return null
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_public_profile_info', { target_user_id: userId })
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching public profile:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Get connected user's detailed profile info
  const getConnectedProfile = async (userId: string): Promise<ConnectedProfileInfo | null> => {
    if (!user) return null
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_connected_profile_info', { target_user_id: userId })
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching connected profile:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Check if users are connected
  const checkConnection = async (userId: string): Promise<boolean> => {
    if (!user || user.id === userId) return false
    
    try {
      const { data, error } = await supabase
        .rpc('users_are_connected', { 
          user1: user.id, 
          user2: userId 
        })

      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error checking connection:', error)
      return false
    }
  }

  // Create a connection between users
  const createConnection = async (targetUserId: string): Promise<boolean> => {
    if (!user || user.id === targetUserId) return false
    
    try {
      // Check rate limit first
      const { data: rateLimitOk, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          action_name: 'create_connection',
          max_requests: 50, // Max 50 connection requests per hour
          window_minutes: 60
        })

      if (rateLimitError) throw rateLimitError
      
      if (!rateLimitOk) {
        toast({
          title: "Rate limit exceeded",
          description: "You've made too many connection requests. Please try again later.",
          variant: "destructive"
        })
        return false
      }

      const { error } = await supabase
        .from('connections')
        .insert({
          user1_id: user.id,
          user2_id: targetUserId
        })

      if (error) {
        // Handle duplicate connection attempts gracefully
        if (error.code === '23505') {
          toast({
            title: "Already connected",
            description: "You are already connected with this user.",
            variant: "default"
          })
          return true
        }
        throw error
      }

      toast({
        title: "Connection created",
        description: "You are now connected with this user.",
        variant: "default"
      })
      return true
    } catch (error) {
      console.error('Error creating connection:', error)
      toast({
        title: "Error",
        description: "Failed to create connection. Please try again.",
        variant: "destructive"
      })
      return false
    }
  }

  // Get user's connections
  const getUserConnections = async (): Promise<ConnectedProfileInfo[]> => {
    if (!user) return []
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('connections')
        .select(`
          user1_id,
          user2_id
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      if (error) throw error

      // Get profile info for all connected users
      const connectedUserIds = data.map(conn => 
        conn.user1_id === user.id ? conn.user2_id : conn.user1_id
      )

      const profiles: ConnectedProfileInfo[] = []
      for (const userId of connectedUserIds) {
        const profile = await getConnectedProfile(userId)
        if (profile) profiles.push(profile)
      }

      return profiles
    } catch (error) {
      console.error('Error fetching connections:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    getPublicProfile,
    getConnectedProfile,
    checkConnection,
    createConnection,
    getUserConnections,
    loading
  }
}