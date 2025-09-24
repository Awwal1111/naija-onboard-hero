import { useState } from 'react'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { supabase } from '@/integrations/supabase/client'

export interface ConnectionRequest {
  id: string
  requester_id: string
  requested_id: string
  status: string // Temporarily use string instead of union type
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
        .select('*')
        .or(`requester_id.eq.${user.id},requested_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch profile data separately for each request
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const [requesterProfile, requestedProfile] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, profile_picture_url, profession')
              .eq('user_id', request.requester_id)
              .single(),
            supabase
              .from('profiles')
              .select('full_name, profile_picture_url, profession')
              .eq('user_id', request.requested_id)
              .single()
          ])

          return {
            ...request,
            requester_profile: requesterProfile.data || undefined,
            requested_profile: requestedProfile.data || undefined
          }
        })
      )
      
      setConnectionRequests(requestsWithProfiles)
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

      if (error) throw error
      
      // Fetch profile data for other users
      const connectionsWithProfiles = await Promise.all(
        (data || []).map(async (conn) => {
          const otherUserId = conn.user1_id === user.id ? conn.user2_id : conn.user1_id
          const { data: otherUserProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, profile_picture_url, profession')
            .eq('user_id', otherUserId)
            .single()

          return {
            ...conn,
            other_user: otherUserProfile ? {
              id: otherUserProfile.user_id,
              full_name: otherUserProfile.full_name,
              profile_picture_url: otherUserProfile.profile_picture_url,
              profession: otherUserProfile.profession
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
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('connection_requests')
        .select('id')
        .or(`and(requester_id.eq.${user.id},requested_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},requested_id.eq.${user.id})`)
        .single()

      if (existingRequest) {
        toast({
          title: "Request Already Sent",
          description: "A connection request already exists with this user.",
          variant: "destructive"
        })
        return { error: 'Request already exists' }
      }

      // Check if already connected
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .single()

      if (existingConnection) {
        toast({
          title: "Already Connected",
          description: "You are already connected to this user.",
          variant: "destructive"
        })
        return { error: 'Already connected' }
      }

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Connection Request Sent",
        description: "Your connection request has been sent successfully.",
      })
      
      fetchConnectionRequests()
      return { success: true }
    } catch (error: any) {
      console.error('Error sending connection request:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send connection request",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }

  const respondToConnectionRequest = async (requestId: string, accept: boolean) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      if (accept) {
        // Get the request details
        const { data: request, error: requestError } = await supabase
          .from('connection_requests')
          .select('requester_id, requested_id')
          .eq('id', requestId)
          .single()

        if (requestError) throw requestError

        // Create connection
        const { error: connectionError } = await supabase
          .from('connections')
          .insert({
            user1_id: request.requester_id,
            user2_id: request.requested_id,
            status: 'connected'
          })

        if (connectionError) throw connectionError

        // Update request status
        const { error: updateError } = await supabase
          .from('connection_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId)

        if (updateError) throw updateError

        toast({
          title: "Connection Accepted",
          description: "You are now connected! You can start chatting.",
        })

        fetchConnections()
      } else {
        // Reject request
        const { error } = await supabase
          .from('connection_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId)

        if (error) throw error

        toast({
          title: "Request Rejected",
          description: "Connection request has been rejected.",
        })
      }

      fetchConnectionRequests()
      return { success: true }
    } catch (error: any) {
      console.error('Error responding to connection request:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to respond to request",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }

  const checkConnection = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || user.id === targetUserId) return false

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Error checking connection:', error)
      return false
    }
  }

  const getSuggestedUsers = async () => {
    if (!user?.id) return []

    try {
      // Get users not connected to current user
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, state_name, lga_name')
        .neq('user_id', user.id)
        .limit(20)

      if (!allUsers) return []

      // Get existing connections
      const { data: connections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      const connectedUserIds = new Set(
        connections?.flatMap(conn => 
          [conn.user1_id, conn.user2_id].filter(id => id !== user.id)
        ) || []
      )

      // Filter out connected users
      return allUsers.filter(u => !connectedUserIds.has(u.user_id))
    } catch (error) {
      console.error('Error getting suggested users:', error)
      return []
    }
  }

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