import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface ConnectionRequest {
  id: string
  requester_id: string
  requested_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  requester_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
  requested_profile?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

export interface Connection {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other_user?: {
    id: string
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

export const useConnections = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)

  const fetchConnectionRequests = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          *,
          requester_profile:profiles!connection_requests_requester_id_fkey(
            full_name,
            profile_picture_url,
            profession
          ),
          requested_profile:profiles!connection_requests_requested_id_fkey(
            full_name,
            profile_picture_url,
            profession
          )
        `)
        .or(`requester_id.eq.${user.id},requested_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching connection requests:', error)
        return
      }

      setConnectionRequests(data || [])
    } catch (error) {
      console.error('Error fetching connection requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching connections:', error)
        return
      }

      // Fetch other user's profile for each connection
      const connectionsWithProfiles = await Promise.all(
        (data || []).map(async (connection) => {
          const otherUserId = connection.user1_id === user.id 
            ? connection.user2_id 
            : connection.user1_id

          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, profile_picture_url, profession')
            .eq('user_id', otherUserId)
            .single()

          return {
            ...connection,
            other_user: profile ? {
              id: profile.user_id,
              full_name: profile.full_name,
              profile_picture_url: profile.profile_picture_url,
              profession: profile.profession
            } : undefined
          }
        })
      )

      setConnections(connectionsWithProfiles)
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user?.id || user.id === targetUserId) return { error: 'Invalid request' }

    try {
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingConnection) {
        return { error: 'Already connected' }
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('connection_requests')
        .select('id')
        .or(`and(requester_id.eq.${user.id},requested_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},requested_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingRequest) {
        return { error: 'Request already sent' }
      }

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId
        })

      if (error) {
        return { error: error.message }
      }

      // Send notification
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'connection_request',
          title: 'New Connection Request',
          message: `${requesterProfile?.full_name || 'Someone'} wants to connect with you`,
          metadata: {
            requester_id: user.id,
            request_type: 'connection'
          }
        })

      toast({
        title: "Connection request sent!",
        description: "Your connection request has been sent successfully.",
      })

      await fetchConnectionRequests()
      return { success: true }
    } catch (error: any) {
      console.error('Error sending connection request:', error)
      return { error: error.message }
    }
  }

  const respondToConnectionRequest = async (requestId: string, accept: boolean) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      // Update request status
      const { data: request, error: updateError } = await supabase
        .from('connection_requests')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId)
        .eq('requested_id', user.id) // Only the requested user can respond
        .select('requester_id, requested_id')
        .single()

      if (updateError) {
        return { error: updateError.message }
      }

      if (accept && request) {
        // Create the connection
        const { error: connectionError } = await supabase
          .from('connections')
          .insert({
            user1_id: request.requester_id,
            user2_id: request.requested_id
          })

        if (connectionError) {
          console.error('Error creating connection:', connectionError)
        }

        // Send notification to requester
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single()

        await supabase
          .from('notifications')
          .insert({
            user_id: request.requester_id,
            type: 'connection_accepted',
            title: 'Connection Accepted',
            message: `${accepterProfile?.full_name || 'Someone'} accepted your connection request`,
            metadata: {
              accepter_id: user.id
            }
          })
      }

      toast({
        title: accept ? "Connection accepted!" : "Connection rejected",
        description: accept 
          ? "You are now connected!" 
          : "Connection request has been rejected.",
      })

      await fetchConnectionRequests()
      await fetchConnections()
      return { success: true }
    } catch (error: any) {
      console.error('Error responding to connection request:', error)
      return { error: error.message }
    }
  }

  const checkConnection = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || user.id === targetUserId) return false

    try {
      const { data } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      return !!data
    } catch (error) {
      console.error('Error checking connection:', error)
      return false
    }
  }

  const getSuggestedUsers = async () => {
    if (!user?.id) return []

    try {
      // Get users based on various criteria
      const { data: users, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, state_name, lga_name')
        .neq('user_id', user.id)
        .limit(20)

      if (error) {
        console.error('Error fetching suggested users:', error)
        return []
      }

      // Get current user's profile for comparison
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('profession, state_name, lga_name')
        .eq('user_id', user.id)
        .single()

      // Get existing connections to exclude
      const { data: existingConnections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      const connectedUserIds = new Set(
        existingConnections?.flatMap(conn => 
          [conn.user1_id, conn.user2_id].filter(id => id !== user.id)
        ) || []
      )

      // Score users based on various factors
      const scoredUsers = users
        .filter(u => !connectedUserIds.has(u.user_id))
        .map(otherUser => {
          let score = 0

          // Same profession (8 points)
          if (currentProfile?.profession && otherUser.profession === currentProfile.profession) {
            score += 8
          }

          // Same state (3 points)
          if (currentProfile?.state_name && otherUser.state_name === currentProfile.state_name) {
            score += 3
          }

          // Same LGA (2 points)
          if (currentProfile?.lga_name && otherUser.lga_name === currentProfile.lga_name) {
            score += 2
          }

          return { ...otherUser, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      return scoredUsers
    } catch (error) {
      console.error('Error getting suggested users:', error)
      return []
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchConnectionRequests()
      fetchConnections()
    }
  }, [user?.id])

  return {
    connectionRequests,
    connections,
    loading,
    sendConnectionRequest,
    respondToConnectionRequest,
    checkConnection,
    getSuggestedUsers,
    refetch: () => {
      fetchConnectionRequests()
      fetchConnections()
    }
  }
}